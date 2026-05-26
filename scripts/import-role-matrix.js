require("dotenv").config();

const path = require("node:path");
const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { parseRoleMatrixFile } = require("../src/importers/role-matrix-parser");
const { createLogger } = require("../src/utils/logger");
const { captureGuildSnapshot } = require("../src/utils/snapshot");

const logger = createLogger("role-matrix-import");

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const fileFlag = argv.find((arg) => arg.startsWith("--file="));

  return {
    dryRun: flags.has("--dry-run") || !flags.has("--apply"),
    apply: flags.has("--apply"),
    filePath: fileFlag
      ? fileFlag.slice("--file=".length)
      : path.join(process.cwd(), "config", "role-matrix.txt"),
  };
}

function groupExistingRoles(guild) {
  const grouped = new Map();

  for (const role of guild.roles.cache.values()) {
    if (role.managed || role.id === guild.id) {
      continue;
    }

    const items = grouped.get(role.name) || [];
    items.push(role);
    grouped.set(role.name, items);
  }

  for (const roles of grouped.values()) {
    roles.sort((left, right) => right.position - left.position);
  }

  return grouped;
}

async function ensureRoleInstance(guild, groupedRoles, roleSpec, dryRun) {
  const existingGroup = groupedRoles.get(roleSpec.name) || [];
  const role = existingGroup[roleSpec.occurrence - 1];

  if (!role) {
    if (dryRun) {
      return { action: "create", role: null };
    }

    const createdRole = await guild.roles.create({
      name: roleSpec.name,
      color: roleSpec.color,
      hoist: roleSpec.hoist,
      mentionable: roleSpec.mentionable,
      permissions: roleSpec.permissions,
      reason: "Role matrix import",
    });

    existingGroup.push(createdRole);
    existingGroup.sort((left, right) => right.position - left.position);
    groupedRoles.set(roleSpec.name, existingGroup);

    return { action: "create", role: createdRole };
  }

  const hasDifferences =
    role.color !== (roleSpec.color || 0) ||
    role.hoist !== roleSpec.hoist ||
    role.mentionable !== roleSpec.mentionable ||
    !role.permissions.equals(roleSpec.permissions);

  if (!hasDifferences) {
    return { action: "skip", role };
  }

  if (dryRun) {
    return { action: "update", role };
  }

  await role.edit({
    color: roleSpec.color,
    hoist: roleSpec.hoist,
    mentionable: roleSpec.mentionable,
    permissions: roleSpec.permissions,
    reason: "Role matrix sync",
  });

  return { action: "update", role };
}

async function syncRolePositions(guild, appliedRoles, dryRun) {
  const me = await guild.members.fetchMe();
  const highestMovablePosition = me.roles.highest.position - 1;

  if (highestMovablePosition <= 0) {
    return { skipped: true, reason: "Bot role is too low to reorder imported roles." };
  }

  const movableRoles = appliedRoles.filter(Boolean).slice(0, highestMovablePosition);
  const positions = movableRoles.map((role, index) => ({
    role,
    position: highestMovablePosition - index,
  }));

  if (dryRun) {
    return { skipped: false, planned: positions.length };
  }

  try {
    await guild.roles.setPositions(positions);
    return { skipped: false, planned: positions.length };
  } catch (error) {
    if (error.code === 50013) {
      return {
        skipped: true,
        reason: "Bot can create roles but cannot reorder them yet. Move the bot role higher, then rerun role sync.",
      };
    }

    throw error;
  }
}

async function importRoleMatrix() {
  const options = parseArgs(process.argv);
  const config = loadConfig();
  const matrix = parseRoleMatrixFile(options.filePath);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.roles.fetch();

      logger.info(`Loaded role matrix from ${options.filePath}`);
      logger.info(options.apply ? "Apply mode enabled." : "Dry-run mode enabled.");

      if (options.apply) {
        const snapshot = await captureGuildSnapshot(guild, "before-role-import");
        logger.info(`Pre-import snapshot saved: ${snapshot.label}`);
      }

      const groupedRoles = groupExistingRoles(guild);
      const results = [];
      const appliedRoles = [];

      for (const roleSpec of matrix.roles) {
        const result = await ensureRoleInstance(guild, groupedRoles, roleSpec, options.dryRun);
        results.push({
          action: result.action,
          name: roleSpec.name,
          occurrence: roleSpec.occurrence,
          color: roleSpec.colorName,
          permissions: roleSpec.permissions.length,
        });

        appliedRoles.push(result.role);
      }

      const positionResult = await syncRolePositions(guild, appliedRoles, options.dryRun);

      const created = results.filter((result) => result.action === "create").length;
      const updated = results.filter((result) => result.action === "update").length;
      const skipped = results.filter((result) => result.action === "skip").length;

      logger.info(`Created/planned roles: ${created}`);
      logger.info(`Updated/planned updates: ${updated}`);
      logger.info(`Skipped unchanged: ${skipped}`);

      if (positionResult.skipped) {
        logger.info(`Role ordering skipped: ${positionResult.reason}`);
      } else {
        logger.info(`Role ordering synced/planned for ${positionResult.planned} role(s).`);
      }

      for (const result of results) {
        logger.info(
          `${result.action.toUpperCase()} role: ${result.name} [${result.occurrence}] (${result.permissions} perms)`,
        );
      }
    } catch (error) {
      logger.error("Role matrix import failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

importRoleMatrix().catch((error) => {
  logger.error("Importer bootstrap failed.", error);
  process.exitCode = 1;
});
