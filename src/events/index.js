const fs = require("node:fs");
const path = require("node:path");

function loadEvents() {
  const eventsPath = __dirname;
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js") && file !== "index.js");

  return eventFiles.map((file) => require(path.join(eventsPath, file)));
}

module.exports = {
  loadEvents,
};
