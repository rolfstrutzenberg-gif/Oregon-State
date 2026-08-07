const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { panelBanner } = require("../constants/panel-banners");
const {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

const GIVEAWAY_JOIN_PREFIX = "giveaway:join:";

function formatTimestamp(iso) {
  if (!iso) {
    return "TBD";
  }

  return `<t:${Math.floor(new Date(iso).getTime() / 1000)}:R>`;
}

function winnerText(giveaway) {
  if (!giveaway.winners?.length) {
    return "Not drawn yet.";
  }

  return giveaway.winners.map((userId) => `<@${userId}>`).join(", ");
}

function giveawayBanner() {
  const banner = panelBanner("giveaways");
  return createMediaAsset({
    localPath: banner.localPath,
    fallbackLocalPath: banner.fallbackLocalPath,
    remoteUrl: banner.remoteUrl,
    fileName: banner.attachmentName,
  });
}

function createGiveawayPanel(giveaway) {
  const banner = giveawayBanner();
  const files = [...banner.files];
  const isOpen = giveaway.status === "Open";

  const body = new ContainerBuilder().setAccentColor(isOpen ? accentColor : 0x656565);
  prependBanner(body, banner.url);

  body
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading("Giveaway")),
      new TextDisplayBuilder().setContent(
        panelDescription(`Hosted by <@${giveaway.hostUserId}>. Review the details below before entering.`),
      ),
    )
    .addSeparatorComponents(
      panelDivider(),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${giveaway.prize}`),
      new TextDisplayBuilder().setContent([
        `**Winners:** ${giveaway.winnerCount}`,
        `**Entries:** ${giveaway.entries.length}`,
        `**Ends:** ${formatTimestamp(giveaway.endsAt)}`,
      ].join("\n")),
    )
    .addSeparatorComponents(
      panelDivider(),
    );

  if (isOpen) {
    body.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Entry Requirements"),
          new TextDisplayBuilder().setContent(giveaway.requirements || "Verified OSRP members may enter."),
          new TextDisplayBuilder().setContent(`Status: **${giveaway.status}**`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`${GIVEAWAY_JOIN_PREFIX}${giveaway.giveawayId}`)
            .setLabel("Enter Giveaway")
            .setStyle(ButtonStyle.Success),
        ),
    );
  } else {
    body.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("### Giveaway Closed"),
      new TextDisplayBuilder().setContent(`Winners: ${winnerText(giveaway)}`),
    );
  }

  body
    .addSeparatorComponents(
      panelDivider({ visible: false }),
    )
    .addTextDisplayComponents(
      footerText(giveaway.giveawayId),
    );

  appendFooterBanner(body, files);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    allowedMentions: { parse: [] },
  };
}

function createGiveawayResultMessage(giveaway, winners = giveaway.winners || []) {
  const winnerLine = winners.length ? winners.map((userId) => `<@${userId}>`).join(", ") : "No valid entries.";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(winners.length ? accentColor : 0x8A4B2A)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(panelHeading("Giveaway Result")),
          new TextDisplayBuilder().setContent(`## ${giveaway.prize}`),
          new TextDisplayBuilder().setContent(`Winner(s): ${winnerLine}`),
        )
        .addSeparatorComponents(
          panelDivider({ visible: false }),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${giveaway.giveawayId} • Entries: ${giveaway.entries.length}`),
        ),
    ],
    allowedMentions: { users: winners },
  };
}

module.exports = {
  GIVEAWAY_JOIN_PREFIX,
  createGiveawayPanel,
  createGiveawayResultMessage,
};
