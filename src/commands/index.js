const fs = require("node:fs");
const path = require("node:path");

function loadCommands() {
  const commandsPath = __dirname;
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") && file !== "index.js");

  const commands = [];
  const commandMap = new Map();

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command);
    commandMap.set(command.data.name, command);
  }

  return {
    commands,
    commandMap,
  };
}

module.exports = {
  loadCommands,
};
