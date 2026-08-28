const activitiesService = require('../modules/activities/activities.service');

/**
 * Polls for due tasks and marks their reminder as sent (simulating a notification
 * dispatch). In production this would push to email/Slack/websocket instead.
 */
function startReminderScheduler({ intervalMs = 5 * 60 * 1000 } = {}) {
  const tick = async () => {
    try {
      const due = await activitiesService.upcomingReminders({ hours: 24 });
      await Promise.all(
        due.map(async (activity) => {
          // eslint-disable-next-line no-console
          console.log(`[reminder] "${activity.subject}" is due at ${activity.due_date}`);
          await activitiesService.markReminderSent(activity.id);
        })
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Reminder scheduler tick failed:', err.message);
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return timer;
}

module.exports = startReminderScheduler;
