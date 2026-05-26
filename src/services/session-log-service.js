function resolveTextChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    const channel = guild.channels.cache.get(explicitId);
    if (channel?.isTextBased()) {
      return channel;
    }
  }

  return guild.channels.cache.find((channel) => channel.isTextBased?.() && channel.name === fallbackName) || null;
}

async function logSessionEvent(guild, message) {
  await guild.channels.fetch().catch(() => null);
  const channel = resolveTextChannel(guild, process.env.GAME_LOGS_CHANNEL_ID, "🎮｜game-logs")
    || resolveTextChannel(guild, process.env.BOT_LOGS_CHANNEL_ID, "⚙️｜bot-logs");

  if (!channel) {
    return false;
  }

  await channel.send({
    content: message,
    allowedMentions: { parse: [] },
  });
  return true;
}

module.exports = {
  logSessionEvent,
};
