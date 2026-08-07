const fs = require("node:fs");
const path = require("node:path");

function loadCommands() {
  const commandsPath = __dirname;
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") && file !== "index.js")
    .filter((file) => !(process.env.NODE_ENV === "production" && file === "verify-mock.js"));

  const commands = [];
  const commandMap = new Map();

  for (const file of commandFiles) {
    const loaded = require(path.join(commandsPath, file));
    const fileCommands = Array.isArray(loaded) ? loaded : [loaded];
    for (const command of fileCommands) {
      commands.push(command);
      commandMap.set(command.data.name, command);
    }
  }

  return {
    commands,
    commandMap,
  };
}

module.exports = {
  loadCommands,
};
