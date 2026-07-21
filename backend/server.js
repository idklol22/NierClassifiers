const app = require('./app');

const port = Number(process.env.PORT || 4174);
app.locals.ready.then(() => {
  app.listen(port, () => console.log(`LearnLoop API listening on http://localhost:${port}`));
}).catch(error => {
  console.error('LearnLoop API failed to start.', error);
  process.exitCode = 1;
});
