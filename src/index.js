require("dotenv").config();

const { loadConfig } = require("./config");
const { createClient } = require("./bootstrap/create-client");
const { registerEvents } = require("./bootstrap/register-events");
const { loadCommands } = require("./commands");
const { loadEvents } = require("./events");
const { createLogger } = require("./utils/logger");

const config = loadConfig();
const logger = createLogger("bootstrap");
const client = createClient();
const { commandMap } = loadCommands();
const events = loadEvents();

client.commands = commandMap;
registerEvents(client, events);

client.login(config.token).catch((error) => {
  logger.error("Login failed.", error);
  process.exitCode = 1;
});
