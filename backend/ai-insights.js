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

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  return (response.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
}

async function callOpenAI({ kind, data }) {
  if (process.env.AI_INSIGHTS_ENABLED === 'false' || !process.env.OPENAI_API_KEY) return null;
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const instructions = `You are LearnLoop's educational insights assistant. Produce supportive, specific maths learning guidance from measured answer data only. Do not diagnose disabilities or personality traits. Do not shame or rank students. Mention uncertainty when evidence is sparse. For a student, speak directly to the student. For a teacher, suggest concrete reteaching and practice actions. Return only JSON matching the provided schema.`;
  const body = {
    model,
    store: false,
    reasoning: { effort: 'low' },
    instructions,
    input: `Insight type: ${kind}\nObserved learning data:\n${JSON.stringify(data)}`,
    max_output_tokens: 900,
    text: { format: { type: 'json_schema', name: 'learnloop_insights', strict: true, schema: responseSchema } }
  };
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAI insight request failed with status ${response.status}.`);
  const payload = await response.json();
  const output = extractOutputText(payload);
  if (!output) throw new Error('OpenAI returned no insight text.');
  return { insight: insightShape.parse(JSON.parse(output)), model, responseId: payload.id };
}

async function generateStudentInsight(input) {
  const fallback = studentFallback(input);
  try { return { ...fallback, ...(await callOpenAI({ kind: 'student', data: compactStudentData(input) }))?.insight, source: process.env.OPENAI_API_KEY ? 'openai' : 'deterministic', model: process.env.OPENAI_MODEL || null }; } catch (error) { console.error(error.message); return { ...fallback, source: 'deterministic-fallback', model: null }; }
}

async function generateTeacherInsight(input) {
  const fallback = teacherFallback(input);
  try { return { ...fallback, ...(await callOpenAI({ kind: 'teacher', data: compactClassData(input) }))?.insight, source: process.env.OPENAI_API_KEY ? 'openai' : 'deterministic', model: process.env.OPENAI_MODEL || null }; } catch (error) { console.error(error.message); return { ...fallback, source: 'deterministic-fallback', model: null }; }
}

module.exports = { generateStudentInsight, generateTeacherInsight };
