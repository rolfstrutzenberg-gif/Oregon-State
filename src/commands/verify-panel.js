const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createVerificationPanelMessage } = require("../utils/verification-panel");
const { loadVerificationConfig } = require("../services/verification-config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify-panel")
    .setDescription("Post the verification panel in the configured verify channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const config = loadVerificationConfig();
    const targetChannelId = config.verifyChannelId || interaction.channelId;
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        content: "The verification target channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    const panel = createVerificationPanelMessage();

    await targetChannel.send({
      components: panel.components,
      files: panel.files,
      flags: panel.flags,
    });

    await interaction.reply({
      content: panel.readiness.hasPortalUrl
        ? `Verification panel posted in <#${targetChannel.id}>.`
        : `Verification panel posted in <#${targetChannel.id}>. The Roblox verification portal still needs to be configured.`,
      ephemeral: true,
    });
  },
};
