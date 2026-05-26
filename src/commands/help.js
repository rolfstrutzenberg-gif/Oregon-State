const { SlashCommandBuilder } = require("discord.js");
const { createBaseEmbed } = require("../utils/embed-factory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the current command set and project focus."),
  async execute(interaction) {
    const embed = createBaseEmbed({
      title: "Command Center",
      description: "This build is focused on a strong foundation first, then premium self-role and panel UX.",
    }).addFields(
      { name: "/ping", value: "Check bot health and latency." },
      { name: "/help", value: "View current commands and project direction." },
      { name: "/about", value: "Show framework and architecture status." },
      { name: "/welcome", value: "Post the welcome join embed." },
      { name: "/verification", value: "Post the verification panel." },
      { name: "/rules", value: "Post the rules panel." },
      { name: "/selfroles", value: "Post the self-role panel." },
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
