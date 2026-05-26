const { SlashCommandBuilder } = require("discord.js");
const { createBaseEmbed } = require("../utils/embed-factory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online."),
  async execute(interaction) {
    const embed = createBaseEmbed({
      title: "Bot Status",
      description: "Oregon State Bot is online and responding.",
    }).addFields(
      { name: "API Latency", value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      { name: "Status", value: "Healthy", inline: true },
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
