const { ChannelType } = require("discord.js");
const { loadRulesConfig } = require("./rules-config");
const { defaultChannelNames } = require("./welcome-config");

const restrictedCategoryNames = new Set([
  "🌲｜ENTRY",
  "📌｜INFORMATION",
]);

const pendingRulesRoleName = "➟ Pending Rules";
const unverifiedRoleName = "➟ Unverified";
const verifiedRoleName = "➟ Verified Community Member";

function resolveChannelByIdOrName(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

function resolveRoleByIdOrName(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.roles.cache.get(explicitId) || null;
  }

  return guild.roles.cache.find((role) => role.name === fallbackName) || null;
}

function categoryChannels(guild) {
  return guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildCategory)
    .sort((left, right) => left.rawPosition - right.rawPosition);
}

function buildVisiblePermissions() {
  return {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    AddReactions: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    UseApplicationCommands: false,
    AttachFiles: false,
    EmbedLinks: false,
    UseExternalEmojis: false,
    UseExternalStickers: false,
  };
}

function buildHiddenPermissions() {
  return {
    ViewChannel: false,
    ReadMessageHistory: false,
    SendMessages: false,
    AddReactions: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    UseApplicationCommands: false,
    AttachFiles: false,
    EmbedLinks: false,
    UseExternalEmojis: false,
    UseExternalStickers: false,
  };
}

async function syncRestrictedVisibility(guild, role) {
  for (const category of categoryChannels(guild).values()) {
    const visible = restrictedCategoryNames.has(category.name);
    const permissions = visible ? buildVisiblePermissions() : buildHiddenPermissions();

    await category.permissionOverwrites.edit(
      role,
      permissions,
      { reason: "Restrict onboarding role visibility" },
    );

    const children = guild.channels.cache.filter((channel) => channel.parentId === category.id);
    for (const child of children.values()) {
      await child.lockPermissions();
    }
  }
}

async function ensurePendingRulesRole(guild) {
  const config = loadRulesConfig();
  const existing = resolveRoleByIdOrName(guild, config.pendingRulesRoleId, pendingRulesRoleName);
  if (existing) {
    return existing;
  }

  const role = await guild.roles.create({
    name: pendingRulesRoleName,
    color: "#FFFFFF",
    hoist: false,
    mentionable: false,
    permissions: [],
    reason: "Create onboarding pending-rules role",
  });

  await syncRestrictedVisibility(guild, role);
  return role;
}

function resolveOnboardingRoles(guild) {
  const config = loadRulesConfig();

  return {
    verifiedRole: resolveRoleByIdOrName(guild, config.verifiedRoleId, verifiedRoleName),
    unverifiedRole: resolveRoleByIdOrName(guild, config.unverifiedRoleId, unverifiedRoleName),
    pendingRulesRole: resolveRoleByIdOrName(guild, config.pendingRulesRoleId, pendingRulesRoleName),
  };
}

function resolveRulesChannel(guild) {
  const config = loadRulesConfig();
  return resolveChannelByIdOrName(guild, config.rulesChannelId, defaultChannelNames.rules);
}

async function moveMemberToPendingRules(member) {
  await member.guild.channels.fetch().catch(() => null);
  await member.guild.roles.fetch().catch(() => null);

  const pendingRulesRole = await ensurePendingRulesRole(member.guild);
  const { verifiedRole, unverifiedRole } = resolveOnboardingRoles(member.guild);

  if (verifiedRole && member.roles.cache.has(verifiedRole.id)) {
    await member.roles.remove(verifiedRole, "Move member into pending-rules onboarding stage").catch(() => null);
  }

  if (!member.roles.cache.has(pendingRulesRole.id)) {
    await member.roles.add(pendingRulesRole, "Verification complete, rules acceptance required");
  }

  if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
    await member.roles.remove(unverifiedRole, "Verification complete, move to rules step").catch(() => null);
  }

  return {
    pendingRulesRole,
    verifiedRole,
    unverifiedRole,
  };
}

async function grantFullAccess(member) {
  await member.guild.roles.fetch().catch(() => null);

  const { verifiedRole, unverifiedRole, pendingRulesRole } = resolveOnboardingRoles(member.guild);

  if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
    await member.roles.add(verifiedRole, "Rules accepted, full access granted");
  }

  if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
    await member.roles.remove(unverifiedRole, "Rules accepted").catch(() => null);
  }

  if (pendingRulesRole && member.roles.cache.has(pendingRulesRole.id)) {
    await member.roles.remove(pendingRulesRole, "Rules accepted").catch(() => null);
  }

  return {
    verifiedRole,
    unverifiedRole,
    pendingRulesRole,
  };
}

module.exports = {
  grantFullAccess,
  moveMemberToPendingRules,
  pendingRulesRoleName,
  resolveOnboardingRoles,
  resolveRulesChannel,
  syncRestrictedVisibility,
};
