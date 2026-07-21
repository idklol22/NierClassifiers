const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cachedQuestions;

function loadQuestionBank() {
  if (cachedQuestions) return cachedQuestions;
  const jsonPath = path.join(__dirname, 'question-bank.json');
  if (fs.existsSync(jsonPath)) {
    cachedQuestions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } else {
    const appPath = path.join(__dirname, '..', 'app.js');
    const source = fs.readFileSync(appPath, 'utf8');
    const match = source.match(/const QUESTION_BANK = \[(.*?)\];\s*const QUESTION_BY_ID/s);
    if (!match) throw new Error('Could not find QUESTION_BANK in app.js');
    const q = (id, title, prompt, options, answer, tags, skills, difficulty, explanation, diagnosis) => ({
      id, title, prompt, options, answer, tags, skills, difficulty, explanation, diagnosis
    });
    cachedQuestions = vm.runInNewContext(`[${match[1]}]`, { q });
  }
  if (!Array.isArray(cachedQuestions) || cachedQuestions.length < 30) {
    throw new Error(`Question bank is unexpectedly small (${cachedQuestions.length})`);
  }
  return cachedQuestions;
}

module.exports = { loadQuestionBank };
