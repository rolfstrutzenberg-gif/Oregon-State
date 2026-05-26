require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { loadCommandConfig } = require("./config");
const { loadCommands } = require("./commands");

async function deployCommands() {
  const config = loadCommandConfig();
  const rest = new REST({ version: "10" }).setToken(config.token);
  const { commands } = loadCommands();
  const payload = commands.map((command) => command.data.toJSON());

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: payload },
  );

  console.log(`Registered ${payload.length} guild command(s) for ${config.guildId}.`);
}

deployCommands().catch((error) => {
  console.error("Failed to register commands.");
  console.error(error);
  process.exitCode = 1;
});
