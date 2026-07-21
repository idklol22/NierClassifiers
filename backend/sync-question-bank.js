const fs = require('fs');
const path = require('path');
const { loadQuestionBank } = require('./question-bank');

const output = path.join(__dirname, 'question-bank.json');
fs.writeFileSync(output, `${JSON.stringify(loadQuestionBank(), null, 2)}\n`);
console.log(`Synced ${loadQuestionBank().length} questions to ${output}`);
