require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { captureGuildSnapshot } = require("../src/utils/snapshot");
const { createLogger } = require("../src/utils/logger");

const logger = createLogger("snapshot");

async function run() {
  const config = loadConfig();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      const snapshot = await captureGuildSnapshot(guild, "manual");
      logger.info(`Snapshot saved: ${snapshot.label}`);
      logger.info(snapshot.filePath);
    } catch (error) {
      logger.error("Snapshot failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

run().catch((error) => {
  logger.error("Snapshot bootstrap failed.", error);
  process.exitCode = 1;
});
