require("dotenv").config();

const { ChannelType, Client, GatewayIntentBits, OverwriteType, PermissionsBitField } = require("discord.js");
const { loadConfig } = require("../src/config");
const { createLogger } = require("../src/utils/logger");
const { listSnapshots, loadSnapshot } = require("../src/utils/snapshot");

const logger = createLogger("restore");

function parseArgs(argv) {
  const labelFlag = argv.find((arg) => arg.startsWith("--label="));
  return {
    label: labelFlag ? labelFlag.slice("--label=".length) : null,
  };
}

function overwritePayloads(overwrites) {
  return overwrites.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type === 1 ? OverwriteType.Member : OverwriteType.Role,
    allow: BigInt(overwrite.allow),
    deny: BigInt(overwrite.deny),
  }));
}

async function restoreRoles(guild, snapshot) {
  await guild.roles.fetch();
  const currentRoles = guild.roles.cache.filter((role) => !role.managed && role.id !== guild.id);
  const snapshotRoles = new Map(snapshot.roles.filter((role) => !role.managed).map((role) => [role.id, role]));

  for (const role of currentRoles.values()) {
    if (!snapshotRoles.has(role.id)) {
      await role.delete("Restoring guild snapshot");
      logger.info(`Deleted role not in snapshot: ${role.name}`);
    }
  }

  for (const roleSpec of snapshot.roles) {
    if (roleSpec.managed) {
      continue;
    }

    const role = guild.roles.cache.get(roleSpec.id);
    if (!role) {
      logger.info(`Skipped recreation for missing role: ${roleSpec.name}`);
      continue;
    }

    await role.edit({
      name: roleSpec.name,
      color: roleSpec.color,
      hoist: roleSpec.hoist,
      mentionable: roleSpec.mentionable,
      permissions: BigInt(roleSpec.permissions),
      reason: "Restoring guild snapshot",
    });
  }

  const me = await guild.members.fetchMe();
  const maxPosition = me.roles.highest.position - 1;
  const movable = snapshot.roles
    .filter((role) => !role.managed)
    .filter((role) => guild.roles.cache.has(role.id))
    .slice(0, Math.max(0, maxPosition));

  await guild.roles.setPositions(
    movable.map((role, index) => ({
      role: role.id,
      position: Math.max(1, maxPosition - index),
    })),
  );
}

async function restoreChannels(guild, snapshot) {
  await guild.channels.fetch();

  const snapshotChannels = new Map(snapshot.channels.map((channel) => [channel.id, channel]));
  const currentChannels = [...guild.channels.cache.values()];

  for (const channel of currentChannels) {
    if (!snapshotChannels.has(channel.id)) {
      await channel.delete("Restoring guild snapshot");
      logger.info(`Deleted channel not in snapshot: ${channel.name}`);
    }
  }

  await guild.channels.fetch();

  for (const channelSpec of snapshot.channels) {
    const channel = guild.channels.cache.get(channelSpec.id);
    if (!channel) {
      logger.info(`Skipped recreation for missing channel: ${channelSpec.name}`);
      continue;
    }

    const editPayload = {
      name: channelSpec.name,
      parent: channelSpec.parentId,
      reason: "Restoring guild snapshot",
    };

    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      editPayload.topic = channelSpec.topic;
      editPayload.rateLimitPerUser = channelSpec.rateLimitPerUser ?? 0;
      editPayload.nsfw = channelSpec.nsfw ?? false;
    }

    if (channel.type === ChannelType.GuildVoice) {
      editPayload.bitrate = channelSpec.bitrate ?? undefined;
      editPayload.userLimit = channelSpec.userLimit ?? undefined;
    }

    await channel.edit(editPayload);
    await channel.permissionOverwrites.set(overwritePayloads(channelSpec.permissionOverwrites), "Restoring guild snapshot");
  }
}

async function run() {
  const { label } = parseArgs(process.argv);
  if (!label) {
    const snapshots = listSnapshots();
    logger.error("Missing --label argument.");
    if (snapshots.length > 0) {
      logger.info(`Available snapshots: ${snapshots.map((item) => item.label).join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const snapshot = loadSnapshot(label);
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await restoreRoles(guild, snapshot);
      await restoreChannels(guild, snapshot);
      logger.info(`Restore completed from snapshot: ${label}`);
    } catch (error) {
      logger.error("Restore failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

run().catch((error) => {
  logger.error("Restore bootstrap failed.", error);
  process.exitCode = 1;
});
