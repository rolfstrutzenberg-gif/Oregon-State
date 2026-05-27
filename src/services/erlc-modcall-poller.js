const { relayModCalls } = require("./erlc-discord-service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("erlc-modcalls");

function pollingEnabled() {
  return String(process.env.ERLC_MODCALL_POLLING_ENABLED || "").toLowerCase() === "true";
}

function pollingIntervalMs() {
  const seconds = Number(process.env.ERLC_MODCALL_POLL_INTERVAL_SECONDS || 20);
  return Math.max(10, seconds) * 1000;
}

async function pollModCalls(client) {
  try {
    const relayed = await relayModCalls(client);
    if (relayed.length > 0) {
      logger.info(`Relayed ${relayed.length} mod call(s).`);
    }
  } catch (error) {
    logger.error("Mod call poll failed.", error);
  }
}

function startErlcModCallPolling(client) {
  if (!pollingEnabled()) {
    logger.info("ER:LC mod call polling disabled.");
    return null;
  }

  if (!process.env.ERLC_API_KEY) {
    logger.info("ER:LC mod call polling enabled but ERLC_API_KEY is missing.");
    return null;
  }

  const interval = pollingIntervalMs();
  logger.info(`ER:LC mod call polling enabled every ${interval / 1000}s.`);
  pollModCalls(client);
  return setInterval(() => pollModCalls(client), interval);
}

module.exports = {
  pollModCalls,
  startErlcModCallPolling,
};
