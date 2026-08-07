const { addIncident, findCaseFile, updateCaseFile } = require("./case-file-service");
const { isLogExemptMember } = require("./log-exemption-service");
const { commandPanel } = require("../utils/command-response");
const { createLogger } = require("../utils/logger");

const logger = createLogger("moderation");

function resolveRole(guild, envName, names) {
  const configuredId = process.env[envName];
  if (configuredId) {
    const configured = guild.roles.cache.get(configuredId);
    if (configured) {
      return configured;
    }
  }

  const lowered = names.map((name) => name.toLowerCase());
  return guild.roles.cache.find((role) => lowered.includes(role.name.toLowerCase())) || null;
}

function resolveMutedRole(guild) {
  return resolveRole(guild, "MUTED_ROLE_ID", ["➟ Muted", "Muted"]);
}

function resolveBlacklistedRole(guild) {
  return resolveRole(guild, "BLACKLISTED_ROLE_ID", ["➟ Blacklisted", "Blacklisted"]);
}

function assertRoleManageable(interaction, role) {
  if (!role || role.id === interaction.guild.id) {
    throw new Error("Select a server role other than @everyone.");
  }
  if (role.managed) {
    throw new Error("Discord-managed roles cannot be changed manually.");
  }

  const ownerBypass = interaction.user.id === interaction.guild.ownerId
    || interaction.user.id === process.env.OWNER_USER_ID;
  if (!ownerBypass && interaction.member.roles.highest.comparePositionTo(role) <= 0) {
    throw new Error("Your highest role must be above the selected role.");
  }
  if (!interaction.guild.members.me || interaction.guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
    throw new Error("Move the bot role above the selected role before using this action.");
  }
}

function assertCanAct(interaction, targetMember) {
  if (!interaction.inGuild() || !targetMember) {
    throw new Error("That member could not be found in this server.");
  }
  if (targetMember.id === interaction.user.id) {
    throw new Error("You cannot use this action on yourself.");
  }
  if (targetMember.id === interaction.guild.ownerId) {
    throw new Error("The server owner cannot be targeted.");
  }

  const actor = interaction.member;
  const botMember = interaction.guild.members.me;
  const ownerBypass = interaction.user.id === interaction.guild.ownerId
    || interaction.user.id === process.env.OWNER_USER_ID;

  if (!ownerBypass && actor.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    throw new Error("Your highest role must be above the target member.");
  }
  if (!botMember || botMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    throw new Error("Move the bot role above the target member before using this action.");
  }
}

function moderationLogChannel(guild) {
  const ids = [process.env.PUNISHMENT_LOGS_CHANNEL_ID, process.env.MODERATION_LOGS_CHANNEL_ID];
  for (const id of ids) {
    const channel = id ? guild.channels.cache.get(id) : null;
    if (channel?.isTextBased()) {
      return channel;
    }
  }

  return guild.channels.cache.find((channel) =>
    channel.isTextBased?.() && /punishment-logs|moderation-logs/u.test(channel.name)
  ) || null;
}

async function recordModerationAction({ interaction, targetUser, targetMember = null, type, reason, result, evidence = null }) {
  if (targetMember && isLogExemptMember(targetMember)) {
    return { exempt: true, incident: null };
  }

  const incident = addIncident({
    targetUser,
    moderatorUser: interaction.user,
    type,
    reason,
    evidence,
    status: "Closed",
  });

  if (type === "Blacklist" || type === "Unblacklist") {
    const caseFile = findCaseFile(targetUser.id);
    const flags = new Set(caseFile?.flags || []);
    if (type === "Blacklist") flags.add("Blacklist");
    else flags.delete("Blacklist");
    updateCaseFile(targetUser.id, {
      flags: [...flags],
      status: type === "Blacklist" ? "Blacklisted" : "Clear",
    });
  }

  const channel = moderationLogChannel(interaction.guild);
  if (channel) {
    await channel.send(commandPanel({
      title: `Moderation • ${type}`,
      tone: ["Ban", "Softban", "Blacklist"].includes(type) ? "danger" : "warning",
      lines: [
        `> Member: <@${targetUser.id}> (${targetUser.id})`,
        `> Moderator: <@${interaction.user.id}> (${interaction.user.id})`,
        `> Reason: **${reason}**`,
        `> Result: **${result}**`,
        `> Case: **${incident.incidentId}**`,
      ],
      footer: `Recorded ${new Date().toISOString()}`,
    })).catch((error) => logger.error("Could not post moderation log.", error));
  }

  return { exempt: false, incident };
}

async function notifyTarget(user, { action, reason, guildName, duration = null }) {
  const lines = [
    `> Server: **${guildName}**`,
    `> Action: **${action}**`,
    `> Reason: **${reason}**`,
    duration ? `> Duration: **${duration}**` : null,
  ].filter(Boolean);
  await user.send(commandPanel({
    title: `Moderation • ${action}`,
    tone: "warning",
    description: "A moderation action was applied to your account.",
    lines,
  })).catch(() => null);
}

module.exports = {
  assertCanAct,
  assertRoleManageable,
  notifyTarget,
  recordModerationAction,
  resolveBlacklistedRole,
  resolveMutedRole,
};
