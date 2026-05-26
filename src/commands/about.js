const { SlashCommandBuilder } = require("discord.js");
const { priorities } = require("../constants/branding");
const { createBaseEmbed } = require("../utils/embed-factory");
const { formatUptime } = require("../utils/runtime-summary");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Show project and runtime details for this bot build."),
  async execute(interaction) {
    const embed = createBaseEmbed({
      title: "Framework Status",
      description: "The core bot architecture is in place and ready for feature work without piling up confusing pathways.",
    }).addFields(
      { name: "Runtime", value: `Node ${process.version}`, inline: true },
      { name: "Uptime", value: formatUptime(process.uptime() * 1000), inline: true },
      { name: "Guild Scope", value: process.env.GUILD_ID ? "Configured" : "Missing env", inline: true },
      { name: "Top Priorities", value: priorities.map((item) => `• ${item}`).join("\n") },
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
