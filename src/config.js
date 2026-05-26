function loadBaseConfig() {
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
  };
}

function assertRequired(config, requiredKeys) {
  const missing = requiredKeys.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function loadConfig() {
  const config = loadBaseConfig();
  assertRequired(config, ["token", "guildId"]);
  return config;
}

function loadCommandConfig() {
  const config = loadBaseConfig();
  assertRequired(config, ["token", "clientId", "guildId"]);
  return config;
}

module.exports = {
  loadConfig,
  loadCommandConfig,
};
