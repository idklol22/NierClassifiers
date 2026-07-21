require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createRepository, loadQuestionBank, id, now } = require('./repository');

const DEMO_CLASS = { id: 'class-advanced', name: 'Upper Maths · Section A' };
const DEMO_USERS = [
  { id: 'teacher-demo', email: 'teacher@learnloop.demo', name: 'Dr. Rivera', role: 'teacher', password: 'teacher123' },
  { id: 'student-demo', email: 'student@learnloop.demo', name: 'Maya Chen', role: 'student', password: 'student123' },
  { id: 'student-jordan', email: 'jordan@learnloop.demo', name: 'Jordan Patel', role: 'student', password: 'student123' },
  { id: 'student-aisha', email: 'aisha@learnloop.demo', name: 'Aisha Osei', role: 'student', password: 'student123' },
  { id: 'student-liam', email: 'liam@learnloop.demo', name: 'Liam Brooks', role: 'student', password: 'student123' },
  { id: 'student-sofia', email: 'sofia@learnloop.demo', name: 'Sofia Ramirez', role: 'student', password: 'student123' },
  { id: 'student-ethan', email: 'ethan@learnloop.demo', name: 'Ethan Wu', role: 'student', password: 'student123' }
];

async function seedRepository(repository, { includeAttempts = true } = {}) {
  await repository.createClass(DEMO_CLASS);
  const questionBank = loadQuestionBank();
  for (const question of questionBank) await repository.upsertQuestion({ ...question, generated: false });

  const users = [];
  for (const item of DEMO_USERS) {
    const existing = await repository.findUserByEmail(item.email);
    const user = existing || await repository.createUser({ id: item.id, email: item.email, name: item.name, role: item.role, passwordHash: await bcrypt.hash(item.password, 12) });
    users.push(user);
    await repository.addMember(DEMO_CLASS.id, user.id);
  }

  if (includeAttempts) {
    const samplePlan = {
      'student-demo': ['algebra', 'functions', 'calculus', 'trigonometry', 'probability'],
      'student-jordan': ['calculus', 'calculus', 'calculus', 'functions', 'geometry'],
      'student-aisha': ['algebra', 'algebra', 'algebra', 'probability', 'matrices'],
      'student-liam': ['calculus', 'geometry', 'trigonometry', 'calculus', 'algebra'],
      'student-sofia': ['trigonometry', 'probability', 'geometry', 'functions', 'matrices'],
      'student-ethan': ['algebra', 'algebra', 'functions', 'probability', 'calculus']
    };
    for (const [studentId, topics] of Object.entries(samplePlan)) {
      const existingAttempts = await repository.getAttemptsForStudent(studentId);
      if (existingAttempts.length) continue;
      for (let index = 0; index < topics.length; index += 1) {
        const question = questionBank.find(item => item.tags.includes(topics[index]));
        if (!question) continue;
        const correct = (studentId === 'student-jordan' || studentId === 'student-liam') ? index !== 0 : index % 3 !== 0;
        const selected = correct ? question.answer : question.options.find(option => option.id !== question.answer).id;
        const selectedOption = question.options.find(option => option.id === selected);
        await repository.createAttempt({
          id: id('attempt'), studentId, questionId: question.id, questionSnapshot: question,
          selectedOptionId: selected, selectedOptionText: selectedOption.text, correct,
          confidence: correct ? 4 : 2, hintUsed: false, tags: question.tags, skills: question.skills,
          diagnosis: correct ? 'Correct application of the target method.' : question.diagnosis[selected], diagnosisSkill: question.skills[0],
          timestamp: new Date(Date.now() - (topics.length - index) * 86400000).toISOString()
        });
      }
    }
  }
  return users;
}

async function main() {
  const repository = createRepository();
  await repository.initialize();
  await seedRepository(repository);
  await repository.close();
  console.log(`LearnLoop seeded using ${repository.mode}.`);
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { seedRepository, DEMO_CLASS, DEMO_USERS };
