require("dotenv").config();

const path = require("node:path");
const { ChannelType, Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { parseLayoutFile } = require("../src/importers/layout-parser");
const { createLogger } = require("../src/utils/logger");
const { captureGuildSnapshot } = require("../src/utils/snapshot");

const logger = createLogger("layout-import");

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const fileFlag = argv.find((arg) => arg.startsWith("--file="));

  return {
    dryRun: flags.has("--dry-run") || !flags.has("--apply"),
    apply: flags.has("--apply"),
    filePath: fileFlag
      ? fileFlag.slice("--file=".length)
      : path.join(process.cwd(), "config", "layout.txt"),
  };
}

async function ensureRole(guild, roleSpec, dryRun) {
  const existingRole = guild.roles.cache.find((role) => role.name === roleSpec.name);

  if (existingRole) {
    return { action: "skip", kind: "role", name: roleSpec.name };
  }

  if (dryRun) {
    return { action: "create", kind: "role", name: roleSpec.name };
  }

  await guild.roles.create({
    name: roleSpec.name,
    color: roleSpec.color,
    hoist: roleSpec.hoist,
    mentionable: roleSpec.mentionable,
    reason: "Layout importer role creation",
  });

  return { action: "create", kind: "role", name: roleSpec.name };
}

async function ensureCategory(guild, categorySpec, dryRun, position) {
  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categorySpec.name,
  );

  if (existingCategory) {
    return { action: "skip", channel: existingCategory };
  }

  if (dryRun) {
    return { action: "create", channel: { name: categorySpec.name } };
  }

  const channel = await guild.channels.create({
    name: categorySpec.name,
    type: ChannelType.GuildCategory,
    position,
    reason: "Layout importer category creation",
  });

  return { action: "create", channel };
}

async function ensureChildChannel(guild, channelSpec, parentId, dryRun, position) {
  const existingChannel = guild.channels.cache.find(
    (channel) =>
      channel.name === channelSpec.name &&
      channel.type === channelSpec.type &&
      channel.parentId === parentId,
  );

  if (existingChannel) {
    return { action: "skip", name: channelSpec.name, type: channelSpec.type };
  }

  if (dryRun) {
    return { action: "create", name: channelSpec.name, type: channelSpec.type };
  }

  await guild.channels.create({
    name: channelSpec.name,
    type: channelSpec.type,
    parent: parentId,
    position,
    reason: "Layout importer channel creation",
  });

  return { action: "create", name: channelSpec.name, type: channelSpec.type };
}

async function importLayout() {
  const options = parseArgs(process.argv);
  const config = loadConfig();
  const layout = parseLayoutFile(options.filePath);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.channels.fetch();
      await guild.roles.fetch();

      logger.info(`Loaded layout from ${options.filePath}`);
      logger.info(options.apply ? "Apply mode enabled." : "Dry-run mode enabled.");

      if (options.apply) {
        const snapshot = await captureGuildSnapshot(guild, "before-layout-import");
        logger.info(`Pre-import snapshot saved: ${snapshot.label}`);
      }

      const results = [];

      for (const role of layout.roles) {
        results.push(await ensureRole(guild, role, options.dryRun));
      }

      for (let categoryIndex = 0; categoryIndex < layout.categories.length; categoryIndex += 1) {
        const categorySpec = layout.categories[categoryIndex];
        const categoryResult = await ensureCategory(guild, categorySpec, options.dryRun, categoryIndex);
        results.push({
          action: categoryResult.action,
          kind: "category",
          name: categorySpec.name,
        });

        const parentId = categoryResult.channel.id;

        for (let channelIndex = 0; channelIndex < categorySpec.channels.length; channelIndex += 1) {
          const channelSpec = categorySpec.channels[channelIndex];
          const channelResult = await ensureChildChannel(
            guild,
            channelSpec,
            parentId,
            options.dryRun,
            channelIndex,
          );

          results.push({
            action: channelResult.action,
            kind: channelSpec.type === ChannelType.GuildVoice ? "voice" : "text",
            name: channelSpec.name,
            category: categorySpec.name,
          });
        }
      }

      const created = results.filter((result) => result.action === "create");
      const skipped = results.filter((result) => result.action === "skip");

      logger.info(`Created/planned: ${created.length}`);
      logger.info(`Skipped existing: ${skipped.length}`);

      for (const result of results) {
        if (result.kind === "role") {
          logger.info(`${result.action.toUpperCase()} role: ${result.name}`);
          continue;
        }

        if (result.kind === "category") {
          logger.info(`${result.action.toUpperCase()} category: ${result.name}`);
          continue;
        }

        logger.info(
          `${result.action.toUpperCase()} ${result.kind}: ${result.category} -> ${result.name}`,
        );
      }
    } catch (error) {
      logger.error("Layout import failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

importLayout().catch((error) => {
  logger.error("Importer bootstrap failed.", error);
  process.exitCode = 1;
});
