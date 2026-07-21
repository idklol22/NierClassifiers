const { z } = require('zod');
const { TOPICS } = require('./learning');

const insightShape = z.object({
  headline: z.string().min(1).max(180),
  summary: z.string().min(1).max(900),
  weakTopics: z.array(z.object({
    topic: z.string().min(1).max(100),
    score: z.number().min(0).max(1),
    evidence: z.string().min(1).max(300),
    action: z.string().min(1).max(300)
  })).max(7),
  nextSteps: z.array(z.string().min(1).max(300)).max(5),
  encouragement: z.string().min(1).max(300),
  teacherSuggestions: z.array(z.string().min(1).max(350)).max(6).default([])
});

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'weakTopics', 'nextSteps', 'encouragement', 'teacherSuggestions'],
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    weakTopics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'score', 'evidence', 'action'],
        properties: {
          topic: { type: 'string' },
          score: { type: 'number' },
          evidence: { type: 'string' },
          action: { type: 'string' }
        }
      }
    },
    nextSteps: { type: 'array', items: { type: 'string' } },
    encouragement: { type: 'string' },
    teacherSuggestions: { type: 'array', items: { type: 'string' } }
  }
};

function topicLabel(id) { return TOPICS.find(topic => topic.id === id)?.label || id; }

function studentFallback({ mastery, attempts }) {
  const weak = [...mastery.topics].sort((a, b) => a.score - b.score).slice(0, 3);
  const incorrect = attempts.filter(attempt => !attempt.correct);
  return {
    headline: weak[0] ? `Your next win is in ${weak[0].label}` : 'Keep building your maths momentum',
    summary: weak[0] ? `Your recent answers show the biggest opportunity in ${weak[0].label}. The practice engine will keep serving targeted questions while you build confidence.` : 'Keep answering questions so LearnLoop can find the most useful next topic for you.',
    weakTopics: weak.map(topic => ({ topic: topicLabel(topic.id), score: topic.score, evidence: `${topic.attempts} tagged answer${topic.attempts === 1 ? '' : 's'} with ${Math.round(topic.score * 100)}% accuracy.`, action: `Review one worked example, then complete two ${topicLabel(topic.id)} questions without using a hint.` })),
    nextSteps: incorrect.length ? ['Read the explanation for your latest incorrect answer.', 'Try the next adaptive question before switching topics.', 'Use the confidence slider honestly so the system can calibrate difficulty.'] : ['Complete a few questions across different topics.', 'Use hints as a learning tool, not a shortcut.', 'Keep your confidence rating honest.'],
    encouragement: 'A wrong answer is useful evidence, not a label. Every attempt makes the next question more personal.',
    teacherSuggestions: []
  };
}

function teacherFallback({ classSummary, students }) {
  const topics = [...classSummary.topicAverages].sort((a, b) => a.score - b.score).slice(0, 3);
  const clusters = classSummary.misconceptionClusters.slice(0, 4);
  return {
    headline: topics[0] ? `Prioritize ${topics[0].label}` : 'Build more class evidence',
    summary: `${classSummary.totalAttempts} attempts across ${classSummary.totalStudents} students show where a short reteach cycle could have the most impact.`,
    weakTopics: topics.map(topic => ({ topic: topic.label, score: topic.score, evidence: `${topic.attempts} tagged attempts at ${Math.round(topic.score * 100)}% class accuracy.`, action: `Run a worked example for ${topic.label}, then assign a short adaptive set focused on the lowest subskills.` })),
    nextSteps: clusters.length ? clusters.map(cluster => `Address ${cluster.skill}: ${cluster.diagnosis}`) : ['Collect another practice cycle before making a class-wide intervention.', 'Review each student’s subskill view for individual support.'],
    encouragement: 'Use these signals to guide instruction, then recheck the same skills after the next practice cycle.',
    teacherSuggestions: [
      ...clusters.slice(0, 3).map(cluster => `Create a mini-lesson for ${cluster.skill} and model the step described by the misconception.`),
      ...students.filter(student => student.priorityTopic).slice(0, 3).map(student => `Give ${student.label} a targeted follow-up on ${student.priorityTopic}.`)
    ]
  };
}

function compactStudentData({ mastery, attempts }) {
  return {
    topics: mastery.topics.map(topic => ({ topic: topic.id, score: Number(topic.score.toFixed(3)), attempts: topic.attempts })),
    subskills: mastery.subskills.map(skill => ({ skill: skill.skill, score: Number(skill.score.toFixed(3)), attempts: skill.attempts, lastDiagnosis: skill.lastDiagnosis })).slice(0, 30),
    recentMistakes: attempts.filter(attempt => !attempt.correct).slice(-12).map(attempt => ({ question: attempt.questionSnapshot?.title || attempt.questionId, skills: attempt.skills, selectedAnswer: attempt.selectedOptionText, diagnosis: attempt.diagnosis }))
  };
}

function compactClassData({ classSummary, students }) {
  return {
    class: { totalStudents: classSummary.totalStudents, activeStudents: classSummary.activeStudents, totalAttempts: classSummary.totalAttempts, averageMastery: Number(classSummary.averageMastery.toFixed(3)) },
    topicAverages: classSummary.topicAverages.map(topic => ({ topic: topic.id, label: topic.label, score: Number(topic.score.toFixed(3)), attempts: topic.attempts })),
    misconceptionClusters: classSummary.misconceptionClusters.slice(0, 12).map(cluster => ({ skill: cluster.skill, diagnosis: cluster.diagnosis, count: cluster.count, students: cluster.students })),
    studentPriorities: students.map(student => ({ label: student.label, priorityTopic: student.priorityTopic, score: student.score }))
  };
}

function parseJsonOutput(value) {
  const text = String(value).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(text);
}

let modelCache = { expiresAt: 0, models: [] };

function modelBase(model) { return String(model || '').split(':')[0]; }
function modelIsFree(model) {
  if (model?.is_free === true || model?.isFree === true) return true;
  const serialized = JSON.stringify(model || {}).toLowerCase();
  return serialized.includes('"is_free":true') || serialized.includes('"isfree":true') || serialized.includes('"price":0');
}
async function discoverModels(token) {
  if (modelCache.expiresAt > Date.now()) return modelCache.models;
  const response = await fetch('https://router.huggingface.co/v1/models', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Hugging Face model discovery failed with status ${response.status}.`);
  const payload = await response.json();
  modelCache = { expiresAt: Date.now() + 10 * 60 * 1000, models: Array.isArray(payload.data) ? payload.data : [] };
  return modelCache.models;
}
async function chooseModels(token) {
  const configured = [process.env.HF_FREE_MODEL, process.env.HF_MODEL || 'openai/gpt-oss-20b:cheapest', ...(process.env.HF_FALLBACK_MODELS || 'HuggingFaceTB/SmolLM3-3B:cheapest').split(',')].map(value => String(value || '').trim()).filter(Boolean);
  let available = [];
  try { available = await discoverModels(token); } catch { /* model discovery is optional; the request loop below remains safe */ }
  const free = available.filter(modelIsFree).map(model => model.id || model.name).filter(Boolean);
  const availableConfigured = configured.filter(candidate => !available.length || available.some(model => modelBase(model.id || model.name) === modelBase(candidate)));
  const candidates = [...(process.env.HF_PREFER_FREE !== 'false' ? free : []), ...availableConfigured, ...configured];
  const unique = [...new Set(candidates)];
  if (process.env.HF_FREE_ONLY === 'true') return unique.filter(candidate => free.includes(candidate) || free.some(model => modelBase(model) === modelBase(candidate)));
  return unique;
}
function messageText(message) { return Array.isArray(message) ? message.map(item => item.text || item.content || '').join('') : String(message || ''); }

async function callHuggingFace({ kind, data }) {
  const token = process.env.HF_TOKEN || process.env.HF_API_KEY;
  if (process.env.AI_INSIGHTS_ENABLED === 'false' || !token) return null;
  const instructions = `You are LearnLoop's educational insights assistant. Produce supportive, specific maths learning guidance from measured answer data only. Do not diagnose disabilities or personality traits. Do not shame or rank students. Mention uncertainty when evidence is sparse. For a student, speak directly to the student. For a teacher, suggest concrete reteaching and practice actions. Return only JSON matching the provided schema.`;
  const models = await chooseModels(token);
  let lastError = new Error('No Hugging Face model is currently available.');
  for (const model of models) {
    try {
      const body = { model, messages: [{ role: 'system', content: `${instructions} The required JSON shape is: ${JSON.stringify(responseSchema)}` }, { role: 'user', content: `Insight type: ${kind}\nObserved learning data:\n${JSON.stringify(data)}` }], max_tokens: 900, temperature: 0.2 };
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      if (!response.ok) { lastError = new Error(`Hugging Face model ${model} returned status ${response.status}.`); continue; }
      const payload = await response.json();
      const output = messageText(payload.choices?.[0]?.message?.content);
      if (!output) { lastError = new Error(`Hugging Face model ${model} returned no insight text.`); continue; }
      return { insight: insightShape.parse(parseJsonOutput(output)), model, responseId: payload.id };
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function generateStudentInsight(input) {
  const fallback = studentFallback(input);
  try { const ai = await callHuggingFace({ kind: 'student', data: compactStudentData(input) }); return { ...fallback, ...(ai?.insight || {}), source: ai ? 'huggingface' : 'deterministic', providerStatus: ai ? 'available' : 'local', message: ai ? 'AI learning insight generated from your measured answers.' : 'Using built-in learning insights from your measured answers.', model: ai?.model || null }; } catch (error) { if (process.env.AI_INSIGHTS_DEBUG === 'true') console.warn(`Student insight fallback: ${error.message}`); return { ...fallback, source: 'deterministic-fallback', providerStatus: 'fallback', message: 'AI insights are temporarily unavailable, so LearnLoop is showing built-in insights from your measured answers.', model: null }; }
}

async function generateTeacherInsight(input) {
  const fallback = teacherFallback(input);
  try { const ai = await callHuggingFace({ kind: 'teacher', data: compactClassData(input) }); return { ...fallback, ...(ai?.insight || {}), source: ai ? 'huggingface' : 'deterministic', providerStatus: ai ? 'available' : 'local', message: ai ? 'AI class insight generated from the class evidence.' : 'Using built-in class insights from the class evidence.', model: ai?.model || null }; } catch (error) { if (process.env.AI_INSIGHTS_DEBUG === 'true') console.warn(`Teacher insight fallback: ${error.message}`); return { ...fallback, source: 'deterministic-fallback', providerStatus: 'fallback', message: 'AI insights are temporarily unavailable, so LearnLoop is showing built-in class insights from the class evidence.', model: null }; }
}

module.exports = { generateStudentInsight, generateTeacherInsight };
