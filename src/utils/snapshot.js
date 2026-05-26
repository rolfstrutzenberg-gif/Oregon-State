const fs = require("node:fs");
const path = require("node:path");
const { ChannelType } = require("discord.js");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function snapshotRoot() {
  return path.join(process.cwd(), "backups");
}

function snapshotPath(name) {
  return path.join(snapshotRoot(), `${name}.json`);
}

function serializePermissionOverwrites(channel) {
  return channel.permissionOverwrites.cache.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  }));
}

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.bitfield.toString(),
    position: role.position,
    managed: role.managed,
  };
}

function serializeChannel(channel) {
  const base = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId ?? null,
    position: "rawPosition" in channel ? channel.rawPosition : channel.position,
    permissionOverwrites: serializePermissionOverwrites(channel),
  };

  if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
    return {
      ...base,
      topic: channel.topic ?? null,
      rateLimitPerUser: channel.rateLimitPerUser ?? 0,
      nsfw: channel.nsfw ?? false,
    };
  }

  if (channel.type === ChannelType.GuildVoice) {
    return {
      ...base,
      bitrate: channel.bitrate ?? null,
      userLimit: channel.userLimit ?? null,
    };
  }

  return base;
}

function buildTimestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function captureGuildSnapshot(guild, labelPrefix = "manual") {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const label = `${labelPrefix}-${buildTimestampLabel()}`;
  const snapshot = {
    createdAt: new Date().toISOString(),
    guildId: guild.id,
    guildName: guild.name,
    roles: guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((left, right) => right.position - left.position)
      .map(serializeRole),
    channels: guild.channels.cache
      .sort((left, right) => {
        const leftParent = left.parent?.rawPosition ?? -1;
        const rightParent = right.parent?.rawPosition ?? -1;
        if (leftParent !== rightParent) {
          return leftParent - rightParent;
        }
        const leftPos = "rawPosition" in left ? left.rawPosition : left.position;
        const rightPos = "rawPosition" in right ? right.rawPosition : right.position;
        return leftPos - rightPos;
      })
      .map(serializeChannel),
  };

  ensureDir(snapshotRoot());
  fs.writeFileSync(snapshotPath(label), `${JSON.stringify(snapshot, null, 2)}\n`);
  return { label, filePath: snapshotPath(label) };
}

function loadSnapshot(label) {
  const filePath = snapshotPath(label);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listSnapshots() {
  const root = snapshotRoot();
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      label: file.replace(/\.json$/u, ""),
      filePath: path.join(root, file),
    }));
}

module.exports = {
  captureGuildSnapshot,
  loadSnapshot,
  listSnapshots,
};
