const { createLogger } = require("../utils/logger");

const logger = createLogger("events");

function executeSafely(event, args) {
  Promise.resolve(event.execute(...args)).catch(async (error) => {
    logger.error(`Unhandled ${event.name} event failure.`, error);
    const interaction = args[0];
    if (!interaction?.isRepliable?.()) {
      return;
    }

    const response = {
      content: "That action could not be completed. Please try again. If it keeps failing, open a support ticket.",
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(response).catch(() => null);
      return;
    }
    await interaction.reply(response).catch(() => null);
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
