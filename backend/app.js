require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const { z } = require('zod');
const { createRepository, id, now, normalizeUser } = require('./repository');
const { seedRepository } = require('./seed');
const { TOPICS, masteryFromAttempts, weakestTopic, getQuestionDiagnosis, getNextQuestion, buildClassDiagnostics, summarizeTopic } = require('./learning');
const { generateStudentInsight, generateTeacherInsight } = require('./ai-insights');

const app = express();
const repository = createRepository();
const apiPrefix = '/api/v1';
const jwtSecret = process.env.JWT_SECRET || (process.env.DEMO_MODE === 'true' ? 'learnloop-local-demo-secret-change-me' : '');
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4173').split(',').map(value => value.trim()).filter(Boolean);
const configuredApiKeys = (process.env.API_KEYS || '').split(',').map(value => value.trim()).filter(Boolean);
const configuredApiKeyHashes = (process.env.API_KEY_HASHES || '').split(',').map(value => value.trim()).filter(Boolean);

if (!jwtSecret) throw new Error('JWT_SECRET must be set outside DEMO_MODE.');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

app.locals.repository = repository;
app.locals.ready = repository.initialize().then(async () => {
  if (process.env.DEMO_MODE === 'true' || process.env.SEED_DEMO_DATA === 'true') await seedRepository(repository);
});
app.use(async (_req, _res, next) => { try { await app.locals.ready; next(); } catch (error) { next(error); } });

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.' } });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many insight requests. Try again later.' } });

function apiError(status, message, details) { const error = new Error(message); error.status = status; error.details = details; return error; }
function requireSchema(schema, value) { const result = schema.safeParse(value); if (!result.success) throw apiError(400, 'Request validation failed.', result.error.flatten()); return result.data; }
function publicUser(user) { return normalizeUser(user); }
function parseBearer(req) { const value = req.get('Authorization') || ''; return value.startsWith('Bearer ') ? value.slice(7) : null; }
function constantTimeEqual(left, right) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function validApiKey(value) {
  if (!value) return false;
  if (configuredApiKeys.some(key => constantTimeEqual(key, value))) return true;
  const digest = crypto.createHash('sha256').update(value).digest('hex');
  return configuredApiKeyHashes.some(hash => constantTimeEqual(hash, digest));
}

async function resolveCredentials(req) {
  req.apiKey = validApiKey(req.get('X-API-Key'));
  const token = parseBearer(req);
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = await repository.findUserById(payload.sub);
      if (!req.user) throw apiError(401, 'The session user no longer exists.');
    } catch (error) {
      if (error.status) throw error;
      throw apiError(401, 'Invalid or expired access token.');
    }
  }
}

async function requireCredentials(req, _res, next) {
  try { await resolveCredentials(req); if (!req.user && !req.apiKey) throw apiError(401, 'Provide a valid Bearer token or X-API-Key.'); next(); } catch (error) { next(error); }
}
async function requireTeacher(req, _res, next) {
  try {
    await resolveCredentials(req);
    if ((!req.user || req.user.role !== 'teacher') && !req.apiKey) throw apiError(403, 'Teacher or service access is required.');
    next();
  } catch (error) { next(error); }
}

async function canAccessStudent(req, studentId) {
  if (req.apiKey) return true;
  if (req.user?.id === studentId) return true;
  if (req.user?.role !== 'teacher') return false;
  const studentClasses = await repository.getStudentClassIds(studentId);
  const teacherClasses = await repository.getTeacherClassIds(req.user.id);
  return studentClasses.some(classId => teacherClasses.includes(classId));
}

async function requireStudentAccess(req, res, next) {
  try {
    await resolveCredentials(req);
    const studentId = req.params.studentId || req.body.studentId;
    if (!req.user && !req.apiKey) throw apiError(401, 'Provide a valid Bearer token or X-API-Key.');
    if (!(await canAccessStudent(req, studentId))) throw apiError(403, 'You are not allowed to access this student.');
    next();
  } catch (error) { next(error); }
}

function issueToken(user) { return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: '7d', issuer: 'learnloop-api', audience: 'learnloop-client' }); }
function sanitizeQuestion(question, includeAnswer = false) {
  if (!question) return null;
  const base = { id: question.id, title: question.title, prompt: question.prompt, options: question.options, tags: question.tags, skills: question.skills, difficulty: question.difficulty, generated: Boolean(question.generated) };
  if (includeAnswer) return { ...base, answer: question.answer, explanation: question.explanation, diagnosis: question.diagnosis || {} };
  return base;
}
async function getStudent(studentId) { const student = await repository.findUserById(studentId); if (!student || student.role !== 'student') throw apiError(404, 'Student not found.'); return student; }
async function getClassAndCheck(req, classId) {
  const classRecord = await repository.getClass(classId);
  if (!classRecord) throw apiError(404, 'Class not found.');
  if (req.apiKey) return classRecord;
  const teacherClasses = await repository.getTeacherClassIds(req.user.id);
  if (!teacherClasses.includes(classId)) throw apiError(403, 'You are not assigned to this class.');
  return classRecord;
}
async function cachedInsight(scopeKey, refresh, generator) {
  const cacheMinutes = Math.min(Math.max(Number(process.env.AI_INSIGHTS_CACHE_MINUTES) || 30, 1), 1440);
  const cached = await repository.getInsight(scopeKey);
  if (!refresh && cached && Date.now() - new Date(cached.createdAt).getTime() < cacheMinutes * 60 * 1000) return { ...cached.payload, cached: true, generatedAt: cached.createdAt };
  const insight = await generator();
  const saved = await repository.saveInsight({ scopeKey, kind: scopeKey.startsWith('class:') ? 'teacher' : 'student', subjectId: scopeKey.split(':')[1], payload: insight, model: insight.model });
  return { ...insight, cached: false, generatedAt: saved.createdAt };
}

const loginSchema = z.object({ email: z.string().email().transform(value => value.toLowerCase()), password: z.string().min(6), role: z.enum(['student', 'teacher']).optional() });
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100), classId: z.string().trim().min(2).max(100).optional() });
const nextSchema = z.object({ studentId: z.string().min(1), preferredTopic: z.string().optional(), avoidQuestionIds: z.array(z.string()).max(50).optional() });
const attemptSchema = z.object({ studentId: z.string().min(1), questionId: z.string().min(1), selectedIndex: z.number().int().min(0).optional(), selectedOptionId: z.string().min(1).optional(), confidence: z.number().int().min(1).max(5).default(3), hintUsed: z.boolean().default(false) }).refine(value => value.selectedIndex !== undefined || value.selectedOptionId !== undefined, { message: 'selectedIndex or selectedOptionId is required' });
const interventionSchema = z.object({ note: z.string().trim().min(3).max(2000) });

app.get('/health', async (_req, res) => res.json({ status: 'ok', service: 'learnloop-api', storage: repository.mode, time: now() }));

const openapi = YAML.load(path.join(__dirname, '..', 'docs', 'openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));
app.get('/openapi.json', (_req, res) => res.json(openapi));

app.post(`${apiPrefix}/auth/login`, loginLimiter, async (req, res, next) => {
  try {
    const input = requireSchema(loginSchema, req.body);
    const user = await repository.findUserByEmail(input.email);
    if (!user || (input.role && user.role !== input.role) || !(await bcrypt.compare(input.password, user.password_hash || user.passwordHash))) throw apiError(401, 'Email, password, or role is incorrect.');
    res.json({ token: issueToken(user), expiresIn: '7d', user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post(`${apiPrefix}/auth/signup`, loginLimiter, async (req, res, next) => {
  try {
    const input = requireSchema(signupSchema, req.body);
    if (input.role === 'teacher' && process.env.ALLOW_TEACHER_SIGNUP !== 'true') throw apiError(403, 'Teacher accounts must be provisioned by an administrator.');
    if (await repository.findUserByEmail(input.email)) throw apiError(409, 'An account with that email already exists.');
    const user = await repository.createUser({ id: id(input.role), email: input.email, name: input.name, role: input.role || 'student', passwordHash: await bcrypt.hash(input.password, 12) });
    if (input.classId) { if (!(await repository.getClass(input.classId))) throw apiError(404, 'Class not found.'); await repository.addMember(input.classId, user.id); }
    res.status(201).json({ token: issueToken(user), expiresIn: '7d', user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/me`, requireCredentials, async (req, res) => {
  if (!req.user) throw apiError(400, '/me requires a Bearer token because an API key has no end-user identity.');
  res.json(publicUser(req.user));
});

app.get(`${apiPrefix}/students/:studentId/mastery`, requireStudentAccess, async (req, res, next) => {
  try {
    const student = await getStudent(req.params.studentId);
    const attempts = await repository.getAttemptsForStudent(student.id);
    const model = masteryFromAttempts(attempts);
    res.json({ student: publicUser(student), topics: model.topics, subskills: model.subskills, attempts: attempts.length, accuracy: attempts.length ? attempts.filter(item => item.correct).length / attempts.length : 0 });
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/students/:studentId/attempts`, requireStudentAccess, async (req, res, next) => {
  try { await getStudent(req.params.studentId); const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100); const attempts = await repository.getAttemptsForStudent(req.params.studentId); res.json(attempts.slice(-limit).reverse()); } catch (error) { next(error); }
});

app.get(`${apiPrefix}/students/:studentId/insights`, aiLimiter, requireStudentAccess, async (req, res, next) => {
  try {
    const student = await getStudent(req.params.studentId);
    const attempts = await repository.getAttemptsForStudent(student.id);
    const mastery = masteryFromAttempts(attempts);
    const insight = await cachedInsight(`student:${student.id}`, req.query.refresh === 'true', () => generateStudentInsight({ mastery, attempts }));
    res.json({ student: publicUser(student), ...insight });
  } catch (error) { next(error); }
});

app.post(`${apiPrefix}/practice/next`, requireStudentAccess, async (req, res, next) => {
  try {
    const input = requireSchema(nextSchema, req.body);
    await getStudent(input.studentId);
    const attempts = await repository.getAttemptsForStudent(input.studentId);
    let questions = await repository.listQuestions({ topic: input.preferredTopic, limit: 200 });
    if (input.avoidQuestionIds?.length) questions = questions.filter(question => !input.avoidQuestionIds.includes(question.id));
    const question = getNextQuestion(questions, attempts, input.preferredTopic);
    if (question.generated) await repository.upsertQuestion(question);
    res.json(sanitizeQuestion(question));
  } catch (error) { next(error); }
});

app.post(`${apiPrefix}/practice/attempts`, requireStudentAccess, async (req, res, next) => {
  try {
    const input = requireSchema(attemptSchema, req.body);
    const question = await repository.getQuestion(input.questionId);
    if (!question) throw apiError(404, 'Question not found. Ask for a new adaptive question first.');
    const selectedOption = input.selectedOptionId ? question.options.find(option => option.id === input.selectedOptionId) : question.options[input.selectedIndex];
    if (!selectedOption) throw apiError(400, 'Selected option does not exist for this question.');
    const correct = selectedOption.id === question.answer;
    const attempt = await repository.createAttempt({ id: id('attempt'), studentId: input.studentId, questionId: question.id, questionSnapshot: question, selectedOptionId: selectedOption.id, selectedOptionText: selectedOption.text, correct, confidence: input.confidence, hintUsed: input.hintUsed, tags: question.tags, skills: question.skills, diagnosis: getQuestionDiagnosis(question, selectedOption.id), diagnosisSkill: question.skills[0], timestamp: now() });
    const attempts = await repository.getAttemptsForStudent(input.studentId);
    const nextQuestion = getNextQuestion(await repository.listQuestions({ limit: 200 }), attempts, weakestTopic(attempts).id);
    if (nextQuestion.generated) await repository.upsertQuestion(nextQuestion);
    res.status(201).json({ attempt, correctAnswer: question.options.find(option => option.id === question.answer)?.text, solution: question.explanation, updatedMastery: masteryFromAttempts(attempts), nextQuestion: sanitizeQuestion(nextQuestion) });
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/questions`, requireCredentials, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
    const questions = await repository.listQuestions({ topic: req.query.topic, skill: req.query.skill, limit });
    const includeAnswers = req.query.includeAnswers === 'true' && (req.apiKey || req.user?.role === 'teacher');
    res.json(questions.map(question => sanitizeQuestion(question, includeAnswers)));
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/teacher/classes/:classId/summary`, requireTeacher, async (req, res, next) => {
  try {
    const classRecord = await getClassAndCheck(req, req.params.classId);
    const students = await repository.listClassStudents(classRecord.id);
    const attempts = await repository.getAttemptsForStudents(students.map(student => student.id));
    const topicAverages = TOPICS.map(topic => summarizeTopic(attempts, topic));
    const diagnostics = buildClassDiagnostics(attempts).map(item => ({ ...item, affectedStudentIds: attempts.filter(attempt => !attempt.correct && attempt.diagnosis === item.diagnosis && attempt.diagnosisSkill === item.skill).map(attempt => attempt.studentId).filter((studentId, index, all) => all.indexOf(studentId) === index) }));
    const studentMastery = students.map(student => ({ student, model: masteryFromAttempts(attempts.filter(attempt => attempt.studentId === student.id)) }));
    const allScores = studentMastery.flatMap(item => item.model.topics.map(topic => topic.score));
    res.json({ classId: classRecord.id, className: classRecord.name, activeStudents: new Set(attempts.map(attempt => attempt.studentId)).size, totalStudents: students.length, totalAttempts: attempts.length, averageMastery: allScores.length ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0.5, topicAverages, misconceptionClusters: diagnostics });
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/teacher/classes/:classId/insights`, aiLimiter, requireTeacher, async (req, res, next) => {
  try {
    const classRecord = await getClassAndCheck(req, req.params.classId);
    const students = await repository.listClassStudents(classRecord.id);
    const attempts = await repository.getAttemptsForStudents(students.map(student => student.id));
    const topicAverages = TOPICS.map(topic => summarizeTopic(attempts, topic));
    const diagnostics = buildClassDiagnostics(attempts).map(item => ({ ...item, affectedStudentIds: attempts.filter(attempt => !attempt.correct && attempt.diagnosis === item.diagnosis && attempt.diagnosisSkill === item.skill).map(attempt => attempt.studentId).filter((studentId, index, all) => all.indexOf(studentId) === index) }));
    const studentPriorities = students.map(student => {
      const model = masteryFromAttempts(attempts.filter(attempt => attempt.studentId === student.id));
      const priority = [...model.topics].sort((a, b) => a.score - b.score)[0];
      return { label: `Student ${students.indexOf(student) + 1}`, priorityTopic: priority?.label || priority?.id, score: priority?.score ?? 0.5 };
    });
    const allScores = students.flatMap(student => masteryFromAttempts(attempts.filter(attempt => attempt.studentId === student.id)).topics.map(topic => topic.score));
    const classSummary = { classId: classRecord.id, className: classRecord.name, activeStudents: new Set(attempts.map(attempt => attempt.studentId)).size, totalStudents: students.length, totalAttempts: attempts.length, averageMastery: allScores.length ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0.5, topicAverages, misconceptionClusters: diagnostics };
    const insight = await cachedInsight(`class:${classRecord.id}`, req.query.refresh === 'true', () => generateTeacherInsight({ classSummary, students: studentPriorities }));
    res.json({ classId: classRecord.id, className: classRecord.name, ...insight });
  } catch (error) { next(error); }
});

app.get(`${apiPrefix}/teacher/classes/:classId/students/:studentId`, requireTeacher, async (req, res, next) => {
  try {
    const classRecord = await getClassAndCheck(req, req.params.classId);
    const student = await getStudent(req.params.studentId);
    const students = await repository.listClassStudents(classRecord.id);
    if (!students.some(item => item.id === student.id)) throw apiError(404, 'Student is not in this class.');
    const attempts = await repository.getAttemptsForStudent(student.id);
    const model = masteryFromAttempts(attempts);
    const wrong = attempts.filter(attempt => !attempt.correct).slice(-20).reverse();
    res.json({ student: publicUser(student), mastery: model, recentIncorrect: wrong, recommendedTopics: model.topics.sort((a, b) => a.score - b.score).slice(0, 3).map(topic => topic.id), interventions: await repository.getInterventions(student.id) });
  } catch (error) { next(error); }
});

app.post(`${apiPrefix}/teacher/classes/:classId/students/:studentId/interventions`, requireTeacher, async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'teacher') throw apiError(403, 'A signed-in teacher account is required to save an intervention.');
    const input = requireSchema(interventionSchema, req.body);
    const classRecord = await getClassAndCheck(req, req.params.classId);
    const student = await getStudent(req.params.studentId);
    const students = await repository.listClassStudents(classRecord.id);
    if (!students.some(item => item.id === student.id)) throw apiError(404, 'Student is not in this class.');
    const intervention = await repository.createIntervention({ id: id('intervention'), teacherId: req.user.id, studentId: student.id, classId: classRecord.id, note: input.note, createdAt: now() });
    res.status(201).json(intervention);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Internal server error.' : error.message, ...(error.details ? { details: error.details } : {}) });
});

module.exports = app;
