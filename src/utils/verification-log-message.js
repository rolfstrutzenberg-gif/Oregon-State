const {
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

const failureColor = 0xc0392b;

function timestamp(value) {
  const milliseconds = Date.parse(value || "");
  return Number.isFinite(milliseconds)
    ? `<t:${Math.floor(milliseconds / 1000)}:F>`
    : "Unknown";
}

function safe(value, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function createVerificationSuccessLog(record) {
  const status = record.onboardingStatus === "rules-accepted"
    ? "Server access granted"
    : "Waiting for rules acceptance";

  return {
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Verification Complete"),
          new TextDisplayBuilder().setContent(
            [
              `> Discord: <@${record.discordUserId}> (${record.discordUserId})`,
              `> Roblox: **${safe(record.robloxUsername)}** (${safe(record.robloxUserId)})`,
              `> Display name: **${safe(record.robloxDisplayName)}**`,
              `> Status: **${status}**`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# Roblox OAuth • ${timestamp(record.verifiedAt)} • Audit ${record.auditId || "recorded"}`,
          ),
        ),
    ],
  };
}

function createVerificationFailureLog(event) {
  return {
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [
      new ContainerBuilder()
        .setAccentColor(failureColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Verification Failed"),
          new TextDisplayBuilder().setContent(
            [
              `> Discord ID: **${safe(event.discordUserId)}**`,
              `> Roblox: **${safe(event.robloxUsername)}** (${safe(event.robloxUserId)})`,
              `> Reason: **${safe(event.error)}**`,
              `> Source: **${safe(event.source)}**`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# Status ${event.statusCode || 500} • ${timestamp(event.occurredAt)} • Audit ${event.auditId || "recorded"}`,
          ),
        ),
    ],
  };
}

module.exports = {
  createVerificationFailureLog,
  createVerificationSuccessLog,
};
