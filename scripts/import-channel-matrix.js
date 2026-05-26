require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { ChannelType, Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { parseChannelMatrixFile } = require("../src/importers/channel-matrix-parser");
const { createLogger } = require("../src/utils/logger");
const { captureGuildSnapshot } = require("../src/utils/snapshot");

const logger = createLogger("channel-matrix-import");

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const fileFlag = argv.find((arg) => arg.startsWith("--file="));

  return {
    dryRun: flags.has("--dry-run") || !flags.has("--apply"),
    apply: flags.has("--apply"),
    filePath: fileFlag
      ? fileFlag.slice("--file=".length)
      : path.join(process.cwd(), "config", "channel-matrix.txt"),
  };
}

function loadSpecialRoles() {
  const filePath = path.join(process.cwd(), "config", "special-roles.json");
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function ensureSpecialRole(guild, groupedRoles, roleSpec, dryRun) {
  const existing = groupedRoles.get(roleSpec.name)?.[0];
  if (existing) {
    return existing;
  }

  if (dryRun) {
    return { name: roleSpec.name, id: `dry-run:${roleSpec.name}` };
  }

  const role = await guild.roles.create({
    name: roleSpec.name,
    color: roleSpec.color,
    hoist: roleSpec.hoist,
    mentionable: roleSpec.mentionable,
    permissions: roleSpec.permissions || [],
    reason: "Special supplemental role creation",
  });

  groupedRoles.set(roleSpec.name, [role]);
  return role;
}

function groupRoles(guild) {
  const map = new Map();
  for (const role of guild.roles.cache.values()) {
    const roles = map.get(role.name) || [];
    roles.push(role);
    map.set(role.name, roles);
  }
  return map;
}

function normalizeMatrixCategoryName(name) {
  return name.replace(/^━━\s*/u, "").replace(/\s*━━$/u, "").trim();
}

function buildOverwritePayload(overwrite, guild, roleLookup) {
  if (overwrite.roleName === "@everyone") {
    return {
      id: guild.roles.everyone.id,
      allow: overwrite.allow,
      deny: overwrite.deny,
    };
  }

  if (overwrite.roleName === "Ticket Opener / Requesting Member") {
    return null;
  }

  const candidates = [
    overwrite.roleName,
    overwrite.roleName === "Unverified / No Verified Role" ? "➟ Unverified" : null,
  ].filter(Boolean);

  const role = candidates.map((name) => roleLookup.get(name)?.[0]).find(Boolean);

  if (!role) {
    throw new Error(`Role referenced in channel matrix not found: ${overwrite.roleName}`);
  }

  return {
    id: role.id,
    allow: overwrite.allow,
    deny: overwrite.deny,
  };
}

async function syncCategory(guild, roleLookup, categorySpec, dryRun) {
  const normalizedName = normalizeMatrixCategoryName(categorySpec.name);
  const category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === normalizedName,
  );

  if (!category) {
    throw new Error(`Category from matrix not found in guild: ${normalizedName}`);
  }

  const overwritePayloads = categorySpec.overwrites
    .map((overwrite) => buildOverwritePayload(overwrite, guild, roleLookup))
    .filter(Boolean);

  if (overwritePayloads.length > 100) {
    return {
      categoryName: normalizedName,
      overwriteCount: overwritePayloads.length,
      childCount: guild.channels.cache.filter((channel) => channel.parentId === category.id).size,
      skipped: true,
      reason: `Discord only allows 100 overwrites per category, but this matrix defines ${overwritePayloads.length}.`,
    };
  }

  if (dryRun) {
    return {
      categoryName: normalizedName,
      overwriteCount: overwritePayloads.length,
      childCount: guild.channels.cache.filter((channel) => channel.parentId === category.id).size,
      skipped: false,
    };
  }

  await category.permissionOverwrites.set(overwritePayloads, "Channel matrix sync");

  const children = guild.channels.cache.filter((channel) => channel.parentId === category.id);
  for (const child of children.values()) {
    await child.lockPermissions();
  }

  return {
    categoryName: normalizedName,
    overwriteCount: overwritePayloads.length,
    childCount: children.size,
    skipped: false,
  };
}

async function importChannelMatrix() {
  const options = parseArgs(process.argv);
  const config = loadConfig();
  const matrix = parseChannelMatrixFile(options.filePath);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.channels.fetch();
      await guild.roles.fetch();

      const roleLookup = groupRoles(guild);
      const specialRoles = loadSpecialRoles();

      for (const roleSpec of specialRoles) {
        await ensureSpecialRole(guild, roleLookup, roleSpec, options.dryRun);
      }

      logger.info(`Loaded channel matrix from ${options.filePath}`);
      logger.info(options.apply ? "Apply mode enabled." : "Dry-run mode enabled.");

      if (options.apply) {
        const snapshot = await captureGuildSnapshot(guild, "before-channel-import");
        logger.info(`Pre-import snapshot saved: ${snapshot.label}`);
      }

      const results = [];
      for (const categorySpec of matrix.categories) {
        results.push(await syncCategory(guild, roleLookup, categorySpec, options.dryRun));
      }

      logger.info(`Synced/planned ${results.length} categories.`);
      for (const result of results) {
        if (result.skipped) {
          logger.info(
            `SKIP category: ${result.categoryName} (${result.overwriteCount} overwrites). ${result.reason}`,
          );
          continue;
        }

        logger.info(
          `SYNC category: ${result.categoryName} (${result.overwriteCount} overwrites, ${result.childCount} child channels)`,
        );
      }

      if (matrix.tickets.length > 0) {
        logger.info(`Captured ${matrix.tickets.length} dynamic ticket template(s) for future ticket automation.`);
      }
    } catch (error) {
      logger.error("Channel matrix import failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

importChannelMatrix().catch((error) => {
  logger.error("Importer bootstrap failed.", error);
  process.exitCode = 1;
});
