const crypto = require("node:crypto");
const { readStore, writeStore } = require("./json-store");
const { commandPanel } = require("../utils/command-response");
const { createLogger } = require("../utils/logger");

const storeName = "reminders.json";
const timers = new Map();
const logger = createLogger("reminders");
const maxTimerDelay = 2_147_000_000;

function readReminders() {
  return readStore(storeName, []);
}

function writeReminders(records) {
  writeStore(storeName, records);
}

function parseReminderDuration(value) {
  const match = String(value || "").trim().toLowerCase().match(/^(\d+)\s*(m|h|d|w)$/u);
  if (!match) return null;
  const amount = Number(match[1]);
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  const duration = amount * multipliers[match[2]];
  if (!Number.isSafeInteger(duration) || duration < 60_000 || duration > 90 * 86_400_000) return null;
  return duration;
}

function createReminder({ userId, guildId, channelId, text, dueAt }) {
  const reminders = readReminders();
  const record = {
    id: crypto.randomUUID(),
    userId,
    guildId,
    channelId,
    text,
    dueAt: new Date(dueAt).toISOString(),
    status: "Pending",
    createdAt: new Date().toISOString(),
    deliveredAt: null,
  };
  reminders.push(record);
  writeReminders(reminders);
  return record;
}

function updateReminder(id, patch) {
  const reminders = readReminders();
  const record = reminders.find((entry) => entry.id === id);
  if (!record) return null;
  Object.assign(record, patch);
  writeReminders(reminders);
  return record;
}

async function deliverReminder(client, reminder) {
  const payload = commandPanel({
    title: "Reminder",
    description: reminder.text,
    tone: "info",
    lines: [`> Set: <t:${Math.floor(new Date(reminder.createdAt).getTime() / 1000)}:R>`],
  });
  const user = await client.users.fetch(reminder.userId).catch(() => null);
  let delivered = Boolean(user && await user.send(payload).then(() => true).catch(() => false));

  if (!delivered && reminder.channelId) {
    const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const fallbackPayload = commandPanel({
        title: "Reminder",
        description: `<@${reminder.userId}>\n${reminder.text}`,
        tone: "info",
        lines: [`> Set: <t:${Math.floor(new Date(reminder.createdAt).getTime() / 1000)}:R>`],
      });
      delivered = Boolean(await channel.send({
        ...fallbackPayload,
        allowedMentions: { users: [reminder.userId] },
      }).then(() => true).catch(() => false));
    }
  }

  updateReminder(reminder.id, {
    status: delivered ? "Delivered" : "Failed",
    deliveredAt: new Date().toISOString(),
  });
}

function scheduleReminder(client, reminder) {
  const remaining = new Date(reminder.dueAt).getTime() - Date.now();
  if (remaining <= 0) {
    deliverReminder(client, reminder).catch((error) => logger.error("Reminder delivery failed.", error));
    return;
  }
  const timer = setTimeout(() => {
    timers.delete(reminder.id);
    if (remaining > maxTimerDelay) {
      scheduleReminder(client, reminder);
      return;
    }
    deliverReminder(client, reminder).catch((error) => logger.error("Reminder delivery failed.", error));
  }, Math.min(remaining, maxTimerDelay));
  timer.unref?.();
  timers.set(reminder.id, timer);
}

function startReminderScheduler(client) {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  for (const reminder of readReminders().filter((entry) => entry.status === "Pending")) {
    scheduleReminder(client, reminder);
  }
  logger.info(`Loaded ${timers.size} pending reminder(s).`);
  return { stop: () => timers.forEach((timer) => clearTimeout(timer)) };
}

module.exports = {
  createReminder,
  parseReminderDuration,
  scheduleReminder,
  startReminderScheduler,
};
