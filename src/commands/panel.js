const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createErlcDashboardMessage } = require("../utils/erlc-dashboard");
const { createBrandedPanelMessage, panelChoices } = require("../utils/branded-panels");

const choices = [
  ...panelChoices(),
  { name: "Game Dashboard", value: "game_dashboard" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Post a branded OSRP panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Panel to post.")
        .setRequired(true)
        .addChoices(...choices),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.guild.channels.fetch().catch(() => null);

    const type = interaction.options.getString("type", true);
    const message = type === "game_dashboard"
      ? createErlcDashboardMessage()
      : createBrandedPanelMessage(type, interaction.guild);

    const { readiness, ...payload } = message;
    await interaction.channel.send(payload);

    const missing = readiness?.missingActions || [];
    const warning = missing.length > 0
      ? ` Missing destination buttons: ${missing.join(", ")}. Add their channel IDs to \`.env\` and repost this panel.`
      : "";

    await interaction.editReply(
      `Posted ${choices.find((choice) => choice.value === type)?.name || "panel"} in <#${interaction.channelId}>.${warning}`,
    );
  },
};
