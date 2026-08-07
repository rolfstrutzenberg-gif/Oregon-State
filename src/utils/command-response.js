const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

const colors = {
  info: accentColor,
  success: 0x2f8f55,
  warning: 0xd69214,
  danger: 0xc0392b,
};

function clean(value) {
  return String(value || "").trim();
}

function commandPanel({ title, description, lines = [], tone = "info", footer = null, mediaUrl = null }) {
  const body = new ContainerBuilder()
    .setAccentColor(colors[tone] || colors.info)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${clean(title)}`),
    );

  if (description) {
    body.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(clean(description)),
    );
  }

  if (lines.length > 0) {
    body
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(lines.filter(Boolean).join("\n")),
      );
  }

  if (mediaUrl) {
    body.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(mediaUrl),
      ),
    );
  }

  body
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${footer || "Oregon State Roleplay • EST 2026"}`),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    allowedMentions: { parse: [] },
  };
}

async function replyPanel(interaction, options, { ephemeral = true } = {}) {
  const payload = commandPanel(options);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  return interaction.reply({
    ...payload,
    flags: payload.flags | (ephemeral ? MessageFlags.Ephemeral : 0),
  });
}

module.exports = {
  commandPanel,
  replyPanel,
};
