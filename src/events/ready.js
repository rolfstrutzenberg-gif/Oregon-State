const { Events } = require("discord.js");
const { priorities } = require("../constants/branding");
const { startErlcModCallPolling } = require("../services/erlc-modcall-poller");
const { startSessionApiPolling } = require("../services/session-api-poller");
const { startVerificationCallbackServer } = require("../services/verification-callback-server");
const { startVerificationRelayPolling } = require("../services/verification-relay-poller");
const { startReminderScheduler } = require("../services/reminder-service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("ready");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Project priorities: ${priorities.join(" | ")}`);
    client.sessionApiPoller = startSessionApiPolling();
    client.erlcModCallPoller = startErlcModCallPolling(client);
    client.verificationRelayPoller = startVerificationRelayPolling(client);
    client.reminderScheduler = startReminderScheduler(client);
    if (!client.verificationRelayPoller) {
      client.verificationCallbackServer = startVerificationCallbackServer(client);
    }
  },
};
