const { fetchModCalls, normalizeModCallEntry } = require("./erlc-api-service");
const { updateModCall, upsertModCalls } = require("./erlc-store");
const { createCommandLogMessage, createModCallMessage } = require("../utils/erlc-dashboard");

async function resolveTextChannel(client, explicitId, fallbackIds = [], fallbackNames = []) {
  const candidateIds = [explicitId, ...fallbackIds].filter(Boolean);

  for (const channelId of candidateIds) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased()) {
      return channel;
    }
  }

  if (!process.env.GUILD_ID) {
    return null;
  }

  const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
  if (!guild) {
    return null;
  }

  await guild.channels.fetch().catch(() => null);
  return guild.channels.cache.find((channel) =>
    channel.isTextBased?.() && fallbackNames.includes(channel.name)
  ) || null;
}

async function resolveErlcCommandLogChannel(client) {
  return resolveTextChannel(
    client,
    process.env.ERLC_COMMAND_LOG_CHANNEL_ID,
    [process.env.GAME_LOGS_CHANNEL_ID, process.env.BOT_LOGS_CHANNEL_ID],
    ["🎮｜game-logs", "⚙️｜bot-logs"],
  );
}

async function resolveModCallChannel(client) {
  return resolveTextChannel(
    client,
    process.env.ERLC_MODCALL_CHANNEL_ID,
    [process.env.GAME_LOGS_CHANNEL_ID, process.env.BOT_LOGS_CHANNEL_ID],
    ["🎮｜game-logs", "⚙️｜bot-logs"],
  );
}

async function sendCommandLog(client, record) {
  const channel = await resolveErlcCommandLogChannel(client);
  if (!channel) {
    return null;
  }

  return channel.send(createCommandLogMessage(record)).catch(() => null);
}

async function relayModCalls(client) {
  const rawCalls = await fetchModCalls();
  const normalized = rawCalls.map(normalizeModCallEntry);
  const created = upsertModCalls(normalized);

  if (created.length === 0) {
    return [];
  }

  const channel = await resolveModCallChannel(client);
  if (!channel) {
    return created;
  }

  const relayed = [];
  for (const call of created) {
    const message = await channel.send(createModCallMessage(call)).catch(() => null);
    if (!message) {
      continue;
    }

    const updated = updateModCall(call.modCallId, {
      relayedAt: new Date().toISOString(),
      relayChannelId: message.channelId,
      relayMessageId: message.id,
    });
    relayed.push(updated || call);
  }

  return relayed;
}

module.exports = {
  relayModCalls,
  resolveErlcCommandLogChannel,
  resolveModCallChannel,
  sendCommandLog,
};
