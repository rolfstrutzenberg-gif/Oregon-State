require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("../src/config");
const { syncCaseFilesFromMembers } = require("../src/services/case-file-service");
const { createLogger } = require("../src/utils/logger");

const logger = createLogger("case-backfill");

async function run() {
  const config = loadConfig();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      const members = await guild.members.fetch();
      const priorityUserIds = [process.env.OWNER_USER_ID, client.user.id].filter(Boolean);
      const synced = syncCaseFilesFromMembers(members, priorityUserIds);

      logger.info(`Backfilled ${synced.length} case file(s).`);
      for (const file of synced.slice(0, 10)) {
        logger.info(`${file.caseFileId} ${file.tag || file.username} ${file.mention}`);
      }
    } catch (error) {
      logger.error("Case file backfill failed.", error);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.token);
}

run().catch((error) => {
  logger.error("Case file backfill bootstrap failed.", error);
  process.exitCode = 1;
});
