const fs = require("node:fs");
const path = require("node:path");
const { ChannelType } = require("discord.js");

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function normalizeRole(parts) {
  const [, name, color = "", hoist = "", mentionable = ""] = parts;

  return {
    name: name.trim(),
    color: color.trim() || undefined,
    hoist: parseBoolean(hoist.split("=").at(-1), false),
    mentionable: parseBoolean(mentionable.split("=").at(-1), false),
  };
}

function parseLayoutFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const lines = source.split(/\r?\n/);

  const layout = {
    roles: [],
    categories: [],
  };

  let currentCategory = null;
  let channelMode = "text";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.toLowerCase() === "voice") {
      channelMode = "voice";
      continue;
    }

    if (line.startsWith("ROLE |")) {
      const parts = line.split("|");
      layout.roles.push(normalizeRole(parts));
      continue;
    }

    const categoryMatch = line.match(/^━━\s*(.+?)\s*━━$/u);
    if (categoryMatch) {
      currentCategory = {
        name: categoryMatch[1].trim(),
        channels: [],
      };
      layout.categories.push(currentCategory);
      channelMode = "text";
      continue;
    }

    if (!currentCategory) {
      throw new Error(`Channel found before any category: ${line}`);
    }

    const textMatch = line.match(/^「(.+?)」\s*(.+)$/u);
    if (textMatch) {
      currentCategory.channels.push({
        type: ChannelType.GuildText,
        emoji: textMatch[1].trim(),
        baseName: textMatch[2].trim(),
        name: `${textMatch[1].trim()}｜${textMatch[2].trim()}`,
      });
      continue;
    }

    const voiceMatch = line.match(/^🔊\s*(.+)$/u);
    if (voiceMatch) {
      currentCategory.channels.push({
        type: ChannelType.GuildVoice,
        baseName: voiceMatch[1].trim(),
        name: voiceMatch[1].trim(),
      });
      continue;
    }

    if (channelMode === "voice") {
      currentCategory.channels.push({
        type: ChannelType.GuildVoice,
        baseName: line,
        name: line,
      });
      continue;
    }

    throw new Error(`Unsupported layout line: ${line}`);
  }

  return layout;
}

module.exports = {
  parseLayoutFile,
};
