const crypto = require("node:crypto");
const http = require("node:http");
const { loadVerificationConfig } = require("./verification-config");
const {
  findVerificationByDiscordUserId,
  findVerificationByRobloxUserId,
  saveVerification,
} = require("./verification-store");
const {
  grantFullAccess,
  moveMemberToPendingRules,
  resolveRulesChannel,
} = require("./onboarding-service");
const {
  findAcceptanceByDiscordUserId,
  isAcceptanceComplete,
} = require("./rules-acceptance-store");
const { ensureCaseFile, updateCaseFile } = require("./case-file-service");
const { appendVerificationAuditEvent } = require("./verification-audit-store");
const { createRulesReferralMessage } = require("../utils/rules-referral-message");
const {
  createVerificationFailureLog,
  createVerificationSuccessLog,
} = require("../utils/verification-log-message");
const { createLogger } = require("../utils/logger");

const logger = createLogger("verification-callback");
const MAX_BODY_BYTES = 32 * 1024;

function safeSecretEquals(received, expected) {
  const receivedBuffer = Buffer.from(String(received || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validatePayload(payload) {
  const required = [
    "discordUserId",
    "guildId",
    "robloxUserId",
    "robloxUsername",
    "robloxDisplayName",
  ];
  const missing = required.filter((key) => !String(payload?.[key] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing verification fields: ${missing.join(", ")}`);
  }

  if (!/^\d{15,25}$/u.test(String(payload.discordUserId))) {
    throw new Error("Invalid Discord user ID.");
  }
  if (!/^\d{15,25}$/u.test(String(payload.guildId))) {
    throw new Error("Invalid guild ID.");
  }
  if (!/^\d+$/u.test(String(payload.robloxUserId))) {
    throw new Error("Invalid Roblox user ID.");
  }
}

function resolveVerifyLogChannel(guild, configuredId) {
  if (configuredId) {
    const configured = guild.channels.cache.get(configuredId);
    if (configured?.isTextBased()) {
      return configured;
    }
  }

  return guild.channels.cache.find(
    (channel) => channel.isTextBased?.() && channel.name.includes("verification"),
  ) || null;
}

async function sendVerificationLog(client, guildId, message) {
  if (!guildId) {
    return false;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    return false;
  }

  await guild.channels.fetch().catch(() => null);
  const config = loadVerificationConfig();
  const logChannel = resolveVerifyLogChannel(guild, config.verifyLogChannelId);
  if (!logChannel) {
    logger.info("Verification log channel could not be resolved.");
    return false;
  }

  await logChannel.send(message);
  return true;
}

function auditIdentity(payload) {
  return {
    discordUserId: payload?.discordUserId ? String(payload.discordUserId) : null,
    guildId: payload?.guildId ? String(payload.guildId) : null,
    robloxUserId: payload?.robloxUserId ? String(payload.robloxUserId) : null,
    robloxUsername: payload?.robloxUsername ? String(payload.robloxUsername) : null,
    robloxDisplayName: payload?.robloxDisplayName ? String(payload.robloxDisplayName) : null,
    provider: payload?.provider ? String(payload.provider) : "roblox-oauth",
  };
}

async function completeVerificationCore(client, payload, context) {
  validatePayload(payload);

  if (process.env.GUILD_ID && payload.guildId !== process.env.GUILD_ID) {
    throw new Error("Verification was started for the wrong server.");
  }

  const existingDiscord = findVerificationByDiscordUserId(payload.discordUserId);
  if (existingDiscord && String(existingDiscord.robloxUserId) !== String(payload.robloxUserId)) {
    const error = new Error("This Discord account is already linked to another Roblox account.");
    error.statusCode = 409;
    throw error;
  }

  const existingRoblox = findVerificationByRobloxUserId(payload.robloxUserId);
  if (existingRoblox && existingRoblox.discordUserId !== payload.discordUserId) {
    const error = new Error("This Roblox account is already linked to another Discord account.");
    error.statusCode = 409;
    throw error;
  }

  const guild = await client.guilds.fetch(payload.guildId);
  await guild.channels.fetch().catch(() => null);
  await guild.roles.fetch().catch(() => null);
  const member = await guild.members.fetch(payload.discordUserId).catch(() => null);
  if (!member) {
    const error = new Error("Discord member was not found in the server.");
    error.statusCode = 404;
    throw error;
  }

  const rulesAcceptance = findAcceptanceByDiscordUserId(member.id);
  const rulesAccepted = isAcceptanceComplete(rulesAcceptance);
  const now = new Date().toISOString();
  const eventAlreadyProcessed = Boolean(
    context.eventId && existingDiscord?.lastEventId === context.eventId,
  );
  let record = saveVerification({
    recordVersion: 1,
    guildId: guild.id,
    discordUserId: member.id,
    discordUsername: member.user.username,
    discordDisplayName: member.displayName,
    discordTag: member.user.tag,
    robloxUserId: String(payload.robloxUserId),
    robloxUsername: String(payload.robloxUsername),
    robloxDisplayName: String(payload.robloxDisplayName),
    verifiedAt: existingDiscord?.verifiedAt || payload.verifiedAt || now,
    firstVerifiedAt: existingDiscord?.firstVerifiedAt || existingDiscord?.verifiedAt || payload.verifiedAt || now,
    lastVerifiedAt: payload.verifiedAt || now,
    updatedAt: now,
    provider: payload.provider || "roblox-oauth",
    onboardingStatus: "role-sync-pending",
    verificationCount: eventAlreadyProcessed
      ? Number(existingDiscord?.verificationCount || 1)
      : Number(existingDiscord?.verificationCount || 0) + 1,
    lastEventId: context.eventId || existingDiscord?.lastEventId || null,
    lastSource: context.source,
    lastError: null,
  });

  try {
    if (rulesAccepted) {
      await grantFullAccess(member);
    } else {
      await moveMemberToPendingRules(member);
    }
  } catch (error) {
    record = saveVerification({
      ...record,
      onboardingStatus: "role-sync-failed",
      lastError: error.message || "Role synchronization failed.",
      updatedAt: new Date().toISOString(),
    });
    error.statusCode = error.statusCode || 503;
    throw error;
  }

  ensureCaseFile({
    id: member.id,
    username: member.user.username,
    tag: member.user.tag,
    displayName: member.displayName,
    bot: member.user.bot,
  });
  updateCaseFile(member.id, {
    robloxUserId: record.robloxUserId,
    robloxUsername: record.robloxUsername,
  });

  const rulesChannel = resolveRulesChannel(guild);
  let referralStatus = rulesAccepted ? "not-required" : "rules-channel-missing";
  if (!rulesAccepted && rulesChannel?.isTextBased()) {
    try {
      await member.send(createRulesReferralMessage(member, rulesChannel));
      referralStatus = "dm-sent";
    } catch (error) {
      referralStatus = "dm-failed";
      logger.info(`Could not DM rules referral to ${member.user.tag}: ${error.message}`);
    }
  }

  record = saveVerification({
    ...record,
    onboardingStatus: rulesAccepted ? "rules-accepted" : "pending-rules",
    rulesReferralStatus: referralStatus,
    rulesReferralAttemptedAt: rulesAccepted ? null : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const auditRecord = appendVerificationAuditEvent({
    type: "verification.completed",
    outcome: "success",
    eventId: context.eventId || null,
    source: context.source,
    ...record,
  });

  await sendVerificationLog(
    client,
    guild.id,
    createVerificationSuccessLog({ ...record, auditId: auditRecord.auditId }),
  ).catch((error) => logger.error("Could not post verification success log.", error));

  return record;
}

async function completeVerification(client, payload, context = {}) {
  const normalizedContext = {
    eventId: context.eventId || null,
    source: context.source || "direct-callback",
  };

  try {
    return await completeVerificationCore(client, payload, normalizedContext);
  } catch (error) {
    let auditRecord;
    try {
      auditRecord = appendVerificationAuditEvent({
        type: "verification.failed",
        outcome: "failure",
        eventId: normalizedContext.eventId,
        source: normalizedContext.source,
        ...auditIdentity(payload),
        statusCode: Number(error.statusCode) || 500,
        error: error.message || "Verification processing failed.",
      });
    } catch (auditError) {
      logger.error("Could not persist verification failure audit.", auditError);
      auditRecord = {
        occurredAt: new Date().toISOString(),
        eventId: normalizedContext.eventId,
        source: normalizedContext.source,
        ...auditIdentity(payload),
        statusCode: Number(error.statusCode) || 500,
        error: error.message || "Verification processing failed.",
      };
    }

    await sendVerificationLog(
      client,
      payload?.guildId,
      createVerificationFailureLog(auditRecord),
    ).catch((logError) => logger.error("Could not post verification failure log.", logError));
    throw error;
  }
}

function startVerificationCallbackServer(client) {
  const config = loadVerificationConfig();
  if (!config.callbackSecret) {
    logger.info("Callback server disabled: BOT_VERIFICATION_CALLBACK_SECRET is missing.");
    return null;
  }

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(response, 200, { ok: true, service: "osrp-verification-callback" });
      return;
    }

    if (request.method !== "POST" || requestUrl.pathname !== "/verification/callback") {
      sendJson(response, 404, { ok: false, error: "Not found." });
      return;
    }

    if (!safeSecretEquals(request.headers["x-osrp-verification-secret"], config.callbackSecret)) {
      sendJson(response, 401, { ok: false, error: "Unauthorized." });
      return;
    }

    try {
      const payload = await readJsonBody(request);
      const record = await completeVerification(client, payload, { source: "direct-callback" });
      sendJson(response, 200, {
        ok: true,
        discordUserId: record.discordUserId,
        robloxUserId: record.robloxUserId,
      });
    } catch (error) {
      logger.error("Verification callback failed.", error);
      sendJson(response, error.statusCode || 400, { ok: false, error: error.message });
    }
  });

  server.listen(config.callbackPort, "0.0.0.0", () => {
    logger.info(`Listening on port ${config.callbackPort}.`);
  });
  server.on("error", (error) => logger.error("Callback server error.", error));
  return server;
}

module.exports = {
  completeVerification,
  safeSecretEquals,
  sendVerificationLog,
  startVerificationCallbackServer,
  validatePayload,
};
