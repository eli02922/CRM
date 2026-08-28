const app = require('./app');
const env = require('./config/env');
const startReminderScheduler = require('./utils/reminderScheduler');

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`CRM API listening on port ${env.port} (${env.nodeEnv})`);
});

startReminderScheduler();

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
