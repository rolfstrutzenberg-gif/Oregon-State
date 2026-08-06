const { loadVerificationConfig } = require("./verification-config");
const { completeVerification } = require("./verification-callback-server");
const { createLogger } = require("../utils/logger");

const logger = createLogger("verification-relay");
const MAX_EVENTS_PER_TICK = 5;

function relayUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function relayHeaders(secret, hasBody = false) {
  return {
    ...(hasBody ? { "content-type": "application/json" } : {}),
    "x-osrp-verification-secret": secret,
  };
}

async function relayRequest(config, pathname, options = {}) {
  const response = await fetch(relayUrl(config.relayUrl, pathname), {
    ...options,
    headers: {
      ...relayHeaders(config.callbackSecret, Boolean(options.body)),
      ...options.headers,
    },
  });
  return response;
}

async function reportResult(config, eventId, action, body) {
  const response = await relayRequest(
    config,
    `verification/events/${eventId}/${action}`,
    {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`Relay ${action} failed with status ${response.status}.`);
  }
}

async function processClaimedEvent(client, config, event) {
  try {
    await completeVerification(client, event.payload);
    await reportResult(config, event.id, "complete");
    logger.info(`Completed verification event ${event.id}.`);
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    const retryable = ![400, 404, 409].includes(statusCode);
    await reportResult(config, event.id, "fail", {
      error: error.message || "Verification processing failed.",
      statusCode,
      retryable,
    });
    logger.error(`Verification event ${event.id} failed.`, error);
  }
}

async function pollVerificationRelay(client, config) {
  for (let index = 0; index < MAX_EVENTS_PER_TICK; index += 1) {
    const response = await relayRequest(config, "verification/claim", { method: "POST" });
    if (response.status === 204) {
      return;
    }
    if (!response.ok) {
      throw new Error(`Relay claim failed with status ${response.status}.`);
    }

    const body = await response.json();
    if (!body.event) {
      return;
    }
    await processClaimedEvent(client, config, body.event);
  }
}

function startVerificationRelayPolling(client) {
  const config = loadVerificationConfig();
  if (!config.relayUrl || !config.callbackSecret) {
    logger.info("Relay polling disabled: VERIFICATION_RELAY_URL is not configured.");
    return null;
  }

  let active = false;
  const tick = async () => {
    if (active) {
      return;
    }
    active = true;
    try {
      await pollVerificationRelay(client, config);
    } catch (error) {
      logger.error("Relay polling failed.", error);
    } finally {
      active = false;
    }
  };

  void tick();
  const timer = setInterval(tick, config.relayPollIntervalMs);
  timer.unref?.();
  logger.info(`Polling ${config.relayUrl} every ${config.relayPollIntervalMs}ms.`);
  return timer;
}

module.exports = {
  pollVerificationRelay,
  relayUrl,
  startVerificationRelayPolling,
};
