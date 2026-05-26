require("dotenv").config();

const { ChannelType, Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { createLogger } = require("../src/utils/logger");
const { captureGuildSnapshot } = require("../src/utils/snapshot");

const logger = createLogger("enforce-unverified-visibility");

const visibleCategoryNames = new Set([
  "🌲｜ENTRY",
  "📌｜INFORMATION",
]);

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));

  return {
    dryRun: flags.has("--dry-run") || !flags.has("--apply"),
    apply: flags.has("--apply"),
  };
}

function resolveRestrictedRoles(guild) {
  const roles = [];
  const unverifiedRole = process.env.UNVERIFIED_ROLE_ID
    ? guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID) || null
    : guild.roles.cache.find((role) => role.name === "➟ Unverified") || null;
  const pendingRulesRole = process.env.PENDING_RULES_ROLE_ID
    ? guild.roles.cache.get(process.env.PENDING_RULES_ROLE_ID) || null
    : guild.roles.cache.find((role) => role.name === "➟ Pending Rules") || null;

  if (unverifiedRole) {
    roles.push(unverifiedRole);
  }

  if (pendingRulesRole) {
    roles.push(pendingRulesRole);
  }

  return roles;
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

async function syncCategory(category, roles, dryRun) {
  const visible = visibleCategoryNames.has(category.name);
  const permissions = visible ? buildVisiblePermissions() : buildHiddenPermissions();
  const children = category.guild.channels.cache.filter((channel) => channel.parentId === category.id);

  if (dryRun) {
    return {
      categoryName: category.name,
      visible,
      childCount: children.size,
    };
  }

  for (const role of roles) {
    await category.permissionOverwrites.edit(
      role,
      permissions,
      { reason: "Restrict onboarding members to ENTRY and INFORMATION" },
    );
  }

  for (const child of children.values()) {
    await child.lockPermissions();
  }

  return {
    categoryName: category.name,
    visible,
    childCount: children.size,
  };
}

async function enforceUnverifiedVisibility() {
  const options = parseArgs(process.argv);
  const config = loadConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.channels.fetch();
      await guild.roles.fetch();

      const restrictedRoles = resolveRestrictedRoles(guild);
      if (restrictedRoles.length === 0) {
        throw new Error("Could not find any restricted onboarding roles.");
      }

      logger.info(options.apply ? "Apply mode enabled." : "Dry-run mode enabled.");
      logger.info(`Restricted roles: ${restrictedRoles.map((role) => `${role.name} (${role.id})`).join(", ")}`);

      if (options.apply) {
        const snapshot = await captureGuildSnapshot(guild, "before-unverified-visibility");
        logger.info(`Pre-apply snapshot saved: ${snapshot.label}`);
      }

      const results = [];
      for (const category of categoryChannels(guild).values()) {
        results.push(await syncCategory(category, restrictedRoles, options.dryRun));
      }

      for (const result of results) {
        logger.info(
          `${result.visible ? "VISIBLE" : "HIDDEN"}: ${result.categoryName} (${result.childCount} child channels)`,
        );
      }

      logger.info(`Processed ${results.length} categories.`);
    } catch (error) {
      logger.error("Unverified visibility enforcement failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

enforceUnverifiedVisibility().catch((error) => {
  logger.error("Bootstrap failed.", error);
  process.exitCode = 1;
});
