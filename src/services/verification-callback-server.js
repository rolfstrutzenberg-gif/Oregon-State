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
const { findAcceptanceByDiscordUserId } = require("./rules-acceptance-store");
const { createRulesReferralMessage } = require("../utils/rules-referral-message");
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

async function completeVerification(client, payload) {
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
  if (rulesAcceptance) {
    await grantFullAccess(member);
  } else {
    await moveMemberToPendingRules(member);
  }

  const record = saveVerification({
    discordUserId: member.id,
    discordTag: member.user.tag,
    robloxUserId: String(payload.robloxUserId),
    robloxUsername: String(payload.robloxUsername),
    robloxDisplayName: String(payload.robloxDisplayName),
    verifiedAt: payload.verifiedAt || new Date().toISOString(),
    provider: "roblox-oauth",
  });

  const rulesChannel = resolveRulesChannel(guild);
  if (!rulesAcceptance && rulesChannel?.isTextBased()) {
    await member.send(createRulesReferralMessage(member, rulesChannel)).catch((error) => {
      logger.info(`Could not DM rules referral to ${member.user.tag}: ${error.message}`);
    });
  }

  const config = loadVerificationConfig();
  const logChannel = resolveVerifyLogChannel(guild, config.verifyLogChannelId);
  if (logChannel) {
    await logChannel.send({
      content: [
        `**Verification Complete** • <@${member.id}>`,
        `Roblox: **${record.robloxUsername}** (${record.robloxUserId})`,
        `Status: ${rulesAcceptance ? "Verified access confirmed" : "Pending rules acceptance"}`,
      ].join("\n"),
      allowedMentions: { parse: [] },
    }).catch(() => null);
  }

  return record;
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
      const record = await completeVerification(client, payload);
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
  startVerificationCallbackServer,
  validatePayload,
};
