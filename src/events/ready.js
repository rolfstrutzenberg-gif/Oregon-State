const { Events } = require("discord.js");
const { priorities } = require("../constants/branding");
const { startErlcModCallPolling } = require("../services/erlc-modcall-poller");
const { startSessionApiPolling } = require("../services/session-api-poller");
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
  },
};
