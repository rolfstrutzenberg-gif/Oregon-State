const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createMockSessionsPanelMessage } = require("../utils/sessions-panel");

function resolveSessionsChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sessions")
    .setDescription("Post the mock session panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.guild.channels.fetch().catch(() => null);

    const targetChannel = resolveSessionsChannel(
      interaction.guild,
      process.env.SESSIONS_CHANNEL_ID,
      "🛰️｜sessions",
    ) || interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.reply({
        content: "The sessions channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    await targetChannel.send(createMockSessionsPanelMessage(interaction.guild));
    await interaction.reply({
      content: `Mock sessions panel posted in <#${targetChannel.id}>.`,
      ephemeral: true,
    });
  },
};
