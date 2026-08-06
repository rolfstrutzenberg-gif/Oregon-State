const crypto = require("node:crypto");

function signatureFor(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateLaunch(requestUrl, secret, now = Date.now()) {
  const context = {
    discordUserId: requestUrl.searchParams.get("discord_user_id"),
    guildId: requestUrl.searchParams.get("guild_id"),
    expiresAt: Number(requestUrl.searchParams.get("expires")),
  };
  const signature = requestUrl.searchParams.get("signature");

  if (!/^\d{15,25}$/u.test(context.discordUserId || "")) {
    throw new Error("Invalid Discord verification session.");
  }
  if (!/^\d{15,25}$/u.test(context.guildId || "")) {
    throw new Error("Invalid server verification session.");
  }
  if (!Number.isSafeInteger(context.expiresAt) || context.expiresAt < Math.floor(now / 1000)) {
    throw new Error("This verification link expired. Return to Discord and start again.");
  }

  const expected = signatureFor(
    `${context.discordUserId}.${context.guildId}.${context.expiresAt}`,
    secret,
  );
  if (!safeEquals(signature, expected)) {
    throw new Error("Invalid verification signature.");
  }

  return context;
}

function encodeContext(context, secret) {
  const payload = Buffer.from(JSON.stringify(context)).toString("base64url");
  return `${payload}.${signatureFor(payload, secret)}`;
}

function decodeContext(value, secret, now = Date.now()) {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !safeEquals(signature, signatureFor(payload, secret))) {
    throw new Error("Verification context is invalid.");
  }

  const context = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (context.expiresAt < Math.floor(now / 1000)) {
    throw new Error("Verification context expired.");
  }
  return context;
}

module.exports = {
  decodeContext,
  encodeContext,
  safeEquals,
  signatureFor,
  validateLaunch,
};
