const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

function buildChannelUrl(guildId, channel) {
  return `https://discord.com/channels/${guildId}/${channel.id}`;
}

function createRulesReferralMessage(member, rulesChannel) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## Verification Complete"),
          new TextDisplayBuilder().setContent("Your verification is complete. Read the rules next to unlock the rest of the server."),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Read Rules →")
              .setStyle(ButtonStyle.Link)
              .setURL(buildChannelUrl(member.guild.id, rulesChannel)),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
        ),
    ],
  };
}

module.exports = {
  createRulesReferralMessage,
};
