const crypto = require('crypto');
const { Pool } = require('pg');
const { loadQuestionBank } = require('./question-bank');

const now = () => new Date().toISOString();
const id = prefix => `${prefix}_${crypto.randomUUID()}`;

const schema = `
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  difficulty INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  diagnosis JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_skills ON questions USING GIN(skills);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_snapshot JSONB NOT NULL,
  selected_option_id TEXT NOT NULL,
  selected_option_text TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  diagnosis TEXT NOT NULL,
  diagnosis_skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attempts_student_created ON attempts(student_id, created_at DESC);
CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions(student_id, created_at DESC);
CREATE TABLE IF NOT EXISTS ai_insights (
  scope_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_subject ON ai_insights(subject_id, created_at DESC);
`;

function normalizeQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    options: row.options,
    answer: row.answer,
    tags: row.tags,
    skills: row.skills,
    difficulty: row.difficulty,
    explanation: row.explanation,
    diagnosis: row.diagnosis,
    generated: Boolean(row.generated)
  };
}

function normalizeUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at || row.createdAt };
}

function normalizeAttempt(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id || row.studentId,
    questionId: row.question_id || row.questionId,
    questionSnapshot: row.question_snapshot || row.questionSnapshot,
    selectedOptionId: row.selected_option_id || row.selectedOptionId,
    selectedOptionText: row.selected_option_text || row.selectedOptionText,
    correct: Boolean(row.correct),
    confidence: row.confidence,
    hintUsed: Boolean(row.hint_used ?? row.hintUsed),
    tags: row.tags || [],
    skills: row.skills || [],
    diagnosis: row.diagnosis,
    diagnosisSkill: row.diagnosis_skill || row.diagnosisSkill,
    timestamp: row.created_at || row.timestamp
  };
}

class MemoryRepository {
  constructor() {
    this.mode = 'memory';
    this.classes = [];
    this.users = [];
    this.members = [];
    this.questions = [];
    this.attempts = [];
    this.interventions = [];
    this.aiInsights = [];
  }

  async initialize() {}
  async close() {}
  async findUserByEmail(email) { return this.users.find(user => user.email === email.toLowerCase()) || null; }
  async findUserById(userId) { return this.users.find(user => user.id === userId) || null; }
  async createUser(user) { this.users.push(user); return user; }
  async createClass(classRecord) { this.classes.push(classRecord); return classRecord; }
  async addMember(classId, userId) { if (!this.members.some(item => item.classId === classId && item.userId === userId)) this.members.push({ classId, userId }); }
  async getClass(classId) { const record = this.classes.find(item => item.id === classId); return record ? { ...record } : null; }
  async getStudentClassIds(studentId) { return this.members.filter(item => item.userId === studentId).map(item => item.classId); }
  async getTeacherClassIds(teacherId) { return this.members.filter(item => item.userId === teacherId).map(item => item.classId); }
  async listClassStudents(classId) { const ids = new Set(this.members.filter(item => item.classId === classId).map(item => item.userId)); return this.users.filter(user => ids.has(user.id) && user.role === 'student'); }
  async getQuestion(questionId) { return this.questions.find(question => question.id === questionId) || null; }
  async listQuestions({ topic, skill, limit = 100 } = {}) { return this.questions.filter(question => (!topic || question.tags.includes(topic)) && (!skill || question.skills.includes(skill))).slice(0, limit); }
  async upsertQuestion(question) { const index = this.questions.findIndex(item => item.id === question.id); if (index === -1) this.questions.push(question); else this.questions[index] = question; return question; }
  async getAttemptsForStudent(studentId) { return this.attempts.filter(attempt => attempt.studentId === studentId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); }
  async getAttemptsForStudents(studentIds) { const wanted = new Set(studentIds); return this.attempts.filter(attempt => wanted.has(attempt.studentId)); }
  async createAttempt(attempt) { this.attempts.push(attempt); return attempt; }
  async getInterventions(studentId) { return this.interventions.filter(item => item.studentId === studentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  async createIntervention(intervention) { this.interventions.push(intervention); return intervention; }
  async getInsight(scopeKey) { const item = this.aiInsights.find(insight => insight.scopeKey === scopeKey); return item || null; }
  async saveInsight(insight) { const item = { ...insight, createdAt: insight.createdAt || now() }; this.aiInsights = this.aiInsights.filter(existing => existing.scopeKey !== item.scopeKey); this.aiInsights.push(item); return item; }
}

class PgRepository {
  constructor(databaseUrl) {
    this.mode = 'postgres';
    this.pool = new Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  }

  async initialize() { await this.pool.query(schema); }
  async close() { await this.pool.end(); }
  async findUserByEmail(email) { const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]); return rows[0] || null; }
  async findUserById(userId) { const { rows } = await this.pool.query('SELECT id,email,name,role,created_at FROM users WHERE id = $1', [userId]); return rows[0] || null; }
  async createUser(user) { const { rows } = await this.pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,created_at', [user.id, user.email.toLowerCase(), user.name, user.role, user.passwordHash]); return rows[0]; }
  async createClass(classRecord) { const { rows } = await this.pool.query('INSERT INTO classes (id,name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name RETURNING *', [classRecord.id, classRecord.name]); return rows[0]; }
  async addMember(classId, userId) { await this.pool.query('INSERT INTO class_members (class_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [classId, userId]); }
  async getClass(classId) { const { rows } = await this.pool.query('SELECT * FROM classes WHERE id = $1', [classId]); return rows[0] || null; }
  async getStudentClassIds(studentId) { const { rows } = await this.pool.query('SELECT class_id FROM class_members WHERE user_id = $1', [studentId]); return rows.map(row => row.class_id); }
  async getTeacherClassIds(teacherId) { const { rows } = await this.pool.query('SELECT cm.class_id FROM class_members cm JOIN users u ON u.id=cm.user_id WHERE cm.user_id=$1 AND u.role=\'teacher\'', [teacherId]); return rows.map(row => row.class_id); }
  async listClassStudents(classId) { const { rows } = await this.pool.query('SELECT u.id,u.email,u.name,u.role,u.created_at FROM users u JOIN class_members cm ON cm.user_id=u.id WHERE cm.class_id=$1 AND u.role=\'student\' ORDER BY u.name', [classId]); return rows; }
  async getQuestion(questionId) { const { rows } = await this.pool.query('SELECT * FROM questions WHERE id=$1', [questionId]); return normalizeQuestion(rows[0]); }
  async listQuestions({ topic, skill, limit = 100 } = {}) { const filters = []; const values = []; if (topic) { values.push(topic); filters.push(`$${values.length}=ANY(tags)`); } if (skill) { values.push(skill); filters.push(`$${values.length}=ANY(skills)`); } values.push(limit); const { rows } = await this.pool.query(`SELECT * FROM questions ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY generated ASC, difficulty ASC, id LIMIT $${values.length}`, values); return rows.map(normalizeQuestion); }
  async upsertQuestion(question) { const { rows } = await this.pool.query('INSERT INTO questions (id,title,prompt,options,answer,tags,skills,difficulty,explanation,diagnosis,generated) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,prompt=EXCLUDED.prompt,options=EXCLUDED.options,answer=EXCLUDED.answer,tags=EXCLUDED.tags,skills=EXCLUDED.skills,difficulty=EXCLUDED.difficulty,explanation=EXCLUDED.explanation,diagnosis=EXCLUDED.diagnosis,generated=EXCLUDED.generated RETURNING *', [question.id, question.title, question.prompt, JSON.stringify(question.options), question.answer, question.tags, question.skills, question.difficulty, question.explanation, JSON.stringify(question.diagnosis || {}), Boolean(question.generated)]); return normalizeQuestion(rows[0]); }
  async getAttemptsForStudent(studentId) { const { rows } = await this.pool.query('SELECT * FROM attempts WHERE student_id=$1 ORDER BY created_at ASC', [studentId]); return rows.map(normalizeAttempt); }
  async getAttemptsForStudents(studentIds) { if (!studentIds.length) return []; const { rows } = await this.pool.query('SELECT * FROM attempts WHERE student_id=ANY($1::text[]) ORDER BY created_at ASC', [studentIds]); return rows.map(normalizeAttempt); }
  async createAttempt(attempt) { const { rows } = await this.pool.query('INSERT INTO attempts (id,student_id,question_id,question_snapshot,selected_option_id,selected_option_text,correct,confidence,hint_used,tags,skills,diagnosis,diagnosis_skill) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *', [attempt.id, attempt.studentId, attempt.questionId, JSON.stringify(attempt.questionSnapshot), attempt.selectedOptionId, attempt.selectedOptionText, attempt.correct, attempt.confidence, attempt.hintUsed, attempt.tags, attempt.skills, attempt.diagnosis, attempt.diagnosisSkill]); return normalizeAttempt(rows[0]); }
  async getInterventions(studentId) { const { rows } = await this.pool.query('SELECT * FROM interventions WHERE student_id=$1 ORDER BY created_at DESC', [studentId]); return rows.map(row => ({ id: row.id, teacherId: row.teacher_id, studentId: row.student_id, classId: row.class_id, note: row.note, createdAt: row.created_at })); }
  async createIntervention(intervention) { const { rows } = await this.pool.query('INSERT INTO interventions (id,teacher_id,student_id,class_id,note) VALUES ($1,$2,$3,$4,$5) RETURNING *', [intervention.id, intervention.teacherId, intervention.studentId, intervention.classId, intervention.note]); const row = rows[0]; return { id: row.id, teacherId: row.teacher_id, studentId: row.student_id, classId: row.class_id, note: row.note, createdAt: row.created_at }; }
  async getInsight(scopeKey) { const { rows } = await this.pool.query('SELECT * FROM ai_insights WHERE scope_key=$1', [scopeKey]); if (!rows[0]) return null; return { scopeKey: rows[0].scope_key, kind: rows[0].kind, subjectId: rows[0].subject_id, payload: rows[0].payload, model: rows[0].model, createdAt: rows[0].created_at }; }
  async saveInsight(insight) { const { rows } = await this.pool.query('INSERT INTO ai_insights (scope_key,kind,subject_id,payload,model) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (scope_key) DO UPDATE SET kind=EXCLUDED.kind,subject_id=EXCLUDED.subject_id,payload=EXCLUDED.payload,model=EXCLUDED.model,created_at=NOW() RETURNING *', [insight.scopeKey, insight.kind, insight.subjectId, JSON.stringify(insight.payload), insight.model || null]); const row = rows[0]; return { scopeKey: row.scope_key, kind: row.kind, subjectId: row.subject_id, payload: row.payload, model: row.model, createdAt: row.created_at }; }
}

function createRepository() {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  if (hasDatabase && process.env.DEMO_MODE !== 'true') return new PgRepository(process.env.DATABASE_URL);
  return new MemoryRepository();
}

module.exports = { createRepository, loadQuestionBank, id, now, normalizeUser };
