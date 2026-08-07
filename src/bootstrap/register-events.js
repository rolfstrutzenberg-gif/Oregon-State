const { createLogger } = require("../utils/logger");

const logger = createLogger("events");

function executeSafely(event, args) {
  Promise.resolve(event.execute(...args)).catch((error) => {
    logger.error(`Unhandled ${event.name} event failure.`, error);
  });
}

function registerEvents(client, events) {
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => executeSafely(event, args));
      continue;
    }

    client.on(event.name, (...args) => executeSafely(event, args));
  }
}

module.exports = {
  registerEvents,
};
