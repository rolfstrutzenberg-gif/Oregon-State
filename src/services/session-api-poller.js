const { recordSessionApiError, updateSessionApiSnapshot } = require("./session-service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("session-api");

function pollingEnabled() {
  return String(process.env.SESSION_API_POLLING_ENABLED || "").toLowerCase() === "true";
}

function pollingIntervalMs() {
  const seconds = Number(process.env.SESSION_API_POLL_INTERVAL_SECONDS || 60);
  return Math.max(15, seconds) * 1000;
}

function requestHeaders() {
  const headers = {
    Accept: "application/json",
  };

  if (process.env.SESSION_API_AUTH_HEADER && process.env.SESSION_API_AUTH_VALUE) {
    headers[process.env.SESSION_API_AUTH_HEADER] = process.env.SESSION_API_AUTH_VALUE;
  }

  if (process.env.ERLC_API_KEY) {
    headers["Server-Key"] = process.env.ERLC_API_KEY;
  }

  return headers;
}

async function pollSessionApi() {
  if (!process.env.SESSION_API_URL) {
    return;
  }

  try {
    const response = await fetch(process.env.SESSION_API_URL, {
      headers: requestHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const snapshot = await response.json();
    updateSessionApiSnapshot(snapshot);
    logger.info("Session API snapshot updated.");
  } catch (error) {
    recordSessionApiError(error.message);
    logger.error("Session API poll failed.", error);
  }
}

function startSessionApiPolling() {
  if (!pollingEnabled()) {
    logger.info("Session API polling disabled.");
    return null;
  }

  if (!process.env.SESSION_API_URL) {
    logger.info("Session API polling enabled but SESSION_API_URL is missing.");
    return null;
  }

  const interval = pollingIntervalMs();
  logger.info(`Session API polling enabled every ${interval / 1000}s.`);
  pollSessionApi();
  return setInterval(pollSessionApi, interval);
}

module.exports = {
  startSessionApiPolling,
};
