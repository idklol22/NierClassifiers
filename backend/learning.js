const crypto = require('crypto');
const { id } = require('./repository');

const TOPICS = [
  { id: 'algebra', label: 'Algebra & equations', blurb: 'Equations, sequences, logarithms and algebraic structure.' },
  { id: 'functions', label: 'Functions', blurb: 'Composite and inverse functions, graphs and transformations.' },
  { id: 'trigonometry', label: 'Trigonometry', blurb: 'Identities, equations, radians and triangle geometry.' },
  { id: 'calculus', label: 'Calculus', blurb: 'Differentiation, integration, tangents and optimization.' },
  { id: 'geometry', label: 'Coordinate geometry & vectors', blurb: 'Lines, circles, vectors and geometric reasoning.' },
  { id: 'probability', label: 'Probability & statistics', blurb: 'Distributions, conditional probability and expected value.' },
  { id: 'matrices', label: 'Matrices & complex numbers', blurb: 'Matrix transformations, determinants and complex arithmetic.' }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function masteryFromAttempts(attempts = []) {
  const topics = Object.fromEntries(TOPICS.map(topic => [topic.id, { id: topic.id, label: topic.label, score: 0.5, attempts: 0, correct: 0 }]));
  const skills = {};
  for (const attempt of attempts) {
    for (const topic of attempt.tags || []) {
      if (!topics[topic]) topics[topic] = { id: topic, label: topic, score: 0.5, attempts: 0, correct: 0 };
      topics[topic].attempts += 1;
      topics[topic].correct += attempt.correct ? 1 : 0;
      topics[topic].score = topics[topic].correct / topics[topic].attempts;
    }
    for (const skill of attempt.skills || []) {
      const item = skills[skill] || { skill, attempts: 0, correct: 0, score: 0.5, lastDiagnosis: '' };
      item.attempts += 1;
      item.correct += attempt.correct ? 1 : 0;
      item.score = item.correct / item.attempts;
      if (!attempt.correct) item.lastDiagnosis = attempt.diagnosis;
      skills[skill] = item;
    }
  }
  return { topics: Object.values(topics), subskills: Object.values(skills) };
}

function weakestTopic(attempts = []) {
  const mastery = masteryFromAttempts(attempts).topics;
  return [...mastery].sort((a, b) => (a.score - b.score) || (a.attempts - b.attempts))[0];
}

function getQuestionDiagnosis(question, selectedOptionId) {
  if (selectedOptionId === question.answer) return 'Correct application of the target method.';
  return question.diagnosis?.[selectedOptionId] || 'The selected method needs another look. Review the worked solution and try a nearby problem.';
}

function chooseQuestion(questions, attempts, requestedTopic) {
  const weak = requestedTopic ? { id: requestedTopic } : weakestTopic(attempts);
  const recent = new Set(attempts.slice(-8).map(attempt => attempt.questionId));
  const candidates = questions.filter(question => question.tags.includes(weak.id) && !recent.has(question.id));
  if (candidates.length) {
    const mastery = masteryFromAttempts(attempts).topics.find(topic => topic.id === weak.id);
    const targetDifficulty = mastery && mastery.score < 0.45 ? 1 : mastery && mastery.score > 0.78 ? 3 : 2;
    return [...candidates].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))[0];
  }
  return questions.find(question => question.tags.includes(weak.id)) || questions[0];
}

function generatedQuestion(topic) {
  const n = 2 + crypto.randomInt(0, 7);
  const m = 3 + crypto.randomInt(0, 6);
  const unique = `gen-${topic}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const make = (title, prompt, correct, distractors, skills, explanation, diagnosis) => ({
    id: unique, title, prompt, options: [correct, ...distractors].map((text, index) => ({ id: String.fromCharCode(97 + index), text })), answer: 'a', tags: [topic], skills, difficulty: 2, explanation, diagnosis, generated: true
  });
  if (topic === 'algebra') return make('Generated linear equation', `Solve ${n}x + ${m} = ${n * 5 + m}.`, 'x = 5', [`x = ${5 + m}`, `x = ${n}`, `x = ${n * 5}`], ['linear equations', 'inverse operations'], `Subtract ${m} from both sides to get ${n}x = ${n * 5}, then divide by ${n}.`, { b: 'The constant was added instead of removed.', c: 'The coefficient was mistaken for the solution.', d: 'The coefficient was multiplied instead of dividing.' });
  if (topic === 'functions') return make('Generated composite function', `If f(x) = ${n}x + 1 and g(x) = x², find f(g(2)).`, `${n * 4 + 1}`, [`${n * 2 + 1}`, `${n * 4}`, `${n + 4}`], ['composition', 'substitution'], `First g(2) = 4. Then f(4) = ${n}(4) + 1 = ${n * 4 + 1}.`, { b: 'The inner function was evaluated incorrectly.', c: 'The constant was omitted.', d: 'The two functions were combined as a sum.' });
  if (topic === 'trigonometry') return make('Generated exact trigonometry', 'What is sin(π/6) + cos(π/3)?', '1', ['1/2', '√3/2', '0'], ['exact values', 'radians'], 'Both exact values are 1/2, so their sum is 1.', { b: 'Only one of the two terms was evaluated.', c: 'The 30° cosine value was used.', d: 'The two terms were treated as opposites.' });
  if (topic === 'calculus') return make('Generated derivative', `Differentiate y = x⁴ − ${n}x.`, `4x³ − ${n}`, [`4x³ − ${n}x`, `x³ − ${n}`, `4x⁴ − ${n}`], ['power rule', 'polynomial differentiation'], 'Apply the power rule term by term: the derivative of x⁴ is 4x³ and the derivative of −nx is −n.', { b: 'The original x term was kept after differentiating.', c: 'The exponent was reduced without multiplying it down.', d: 'The original power was not reduced.' });
  if (topic === 'geometry') return make('Generated vector magnitude', `What is the magnitude of the vector (${n}, ${m})?`, `√${n * n + m * m}`, [`${n + m}`, `${n * m}`, `${n * n + m * m}`], ['vector magnitude', 'Pythagoras'], 'Use √(x² + y²) for the magnitude of a two-dimensional vector.', { b: 'The components were added instead of using Pythagoras.', c: 'The components were multiplied.', d: 'The squared magnitude was reported without taking the square root.' });
  if (topic === 'matrices') return make('Generated determinant', `Find det([[${n}, 2], [1, ${m}]]).`, String(n * m - 2), [String(n * m + 2), String(n + m), String(n * m)], ['determinants', '2x2 matrices'], `For [[a,b],[c,d]], det = ad − bc = ${n}(${m}) − 2(1) = ${n * m - 2}.`, { b: 'The off-diagonal product was added.', c: 'The diagonal entries were added instead of multiplied.', d: 'The off-diagonal product was omitted.' });
  return make('Generated probability', `If P(A) = 0.${n} and P(B) = 0.${m}, with A and B independent, find P(A ∩ B).`, `0.${n * m}`, [`0.${n + m}`, `0.${n}`, '1'], ['independence', 'intersection'], `Independent events multiply: P(A ∩ B) = P(A)P(B).`, { b: 'The probabilities were added.', c: 'Only the first event was reported.', d: 'The sample space was confused with the intersection.' });
}

function getNextQuestion(questions, attempts, requestedTopic) {
  const selected = chooseQuestion(questions, attempts, requestedTopic);
  const recent = new Set(attempts.slice(-8).map(attempt => attempt.questionId));
  if (selected && !recent.has(selected.id)) return selected;
  return generatedQuestion(requestedTopic || weakestTopic(attempts).id);
}

function buildClassDiagnostics(attempts) {
  const grouped = {};
  for (const attempt of attempts.filter(item => !item.correct)) {
    const key = `${attempt.diagnosisSkill || attempt.skills?.[0] || 'unknown'}::${attempt.diagnosis}`;
    const item = grouped[key] || { skill: attempt.diagnosisSkill || attempt.skills?.[0] || 'Unknown skill', diagnosis: attempt.diagnosis, count: 0, students: new Set(), examples: [] };
    item.count += 1;
    item.students.add(attempt.studentId);
    if (item.examples.length < 5) item.examples.push(attempt);
    grouped[key] = item;
  }
  return Object.values(grouped).map(item => ({ ...item, students: item.students.size })).sort((a, b) => b.count - a.count);
}

function summarizeTopic(attempts, topic) {
  const tagged = attempts.filter(attempt => attempt.tags.includes(topic.id));
  const correct = tagged.filter(attempt => attempt.correct).length;
  return { ...topic, attempts: tagged.length, correct, score: tagged.length ? correct / tagged.length : 0.5 };
}

module.exports = { TOPICS, masteryFromAttempts, weakestTopic, getQuestionDiagnosis, getNextQuestion, generatedQuestion, buildClassDiagnostics, summarizeTopic, clamp, id };
