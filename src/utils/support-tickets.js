const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

const SUPPORT_TICKET_PREFIX = "support:ticket:";
const SUPPORT_TICKET_SELECT_ID = "support:ticket-select";
const SUPPORT_TICKET_MODAL_PREFIX = "support:ticket-modal:";
const SUPPORT_ROBLOX_ID = "support:roblox";
const SUPPORT_SUMMARY_ID = "support:summary";
const SUPPORT_DETAILS_ID = "support:details";
const SUPPORT_PROOF_ID = "support:proof";

const ticketTypes = {
  general: {
    label: "General Support",
    title: "General Support",
    description: "Server questions, account help, or anything that does not fit another category.",
    modalTitle: "General Support",
    summaryLabel: "What do you need help with?",
    detailsLabel: "Details",
    proofLabel: "Link / screenshot / extra info",
    accent: 0x315B33,
  },
  report: {
    label: "Player Report",
    title: "Player Report",
    description: "Report a player, staff concern, rule break, or situation that needs review.",
    modalTitle: "Report Player",
    summaryLabel: "Who or what are you reporting?",
    detailsLabel: "What happened?",
    proofLabel: "Proof / clip / screenshot link",
    accent: 0x8A4B2A,
  },
  partnership: {
    label: "Partnership",
    title: "Partnership Request",
    description: "Request a partnership, affiliate review, or ad discussion with OSRP staff.",
    modalTitle: "Partnership Request",
    summaryLabel: "Server / group name",
    detailsLabel: "Tell us about the partnership",
    proofLabel: "Invite / ad / server link",
    accent: 0x4A6542,
  },
  appeal: {
    label: "Appeal",
    title: "Appeal",
    description: "Appeal a warning, moderation action, blacklist, or removal.",
    modalTitle: "Appeal",
    summaryLabel: "What are you appealing?",
    detailsLabel: "Why should this be reviewed?",
    proofLabel: "Proof / context / case info",
    accent: 0x7A6330,
  },
  staff_contact: {
    label: "Staff Contact",
    title: "Staff Contact",
    description: "Private staff contact for something sensitive or management-level.",
    modalTitle: "Staff Contact",
    summaryLabel: "Reason for contact",
    detailsLabel: "What does staff need to know?",
    proofLabel: "Extra context",
    accent: 0x2D4F3A,
  },
};

function createSupportTicketButtons() {
  return [
    new ActionRowBuilder().addComponents(
      Object.entries(ticketTypes).slice(0, 3).map(([key, type]) =>
        new ButtonBuilder()
          .setCustomId(`${SUPPORT_TICKET_PREFIX}${key}`)
          .setLabel(type.label)
          .setStyle(key === "report" ? ButtonStyle.Danger : ButtonStyle.Primary),
      ),
    ),
    new ActionRowBuilder().addComponents(
      Object.entries(ticketTypes).slice(3, 5).map(([key, type]) =>
        new ButtonBuilder()
          .setCustomId(`${SUPPORT_TICKET_PREFIX}${key}`)
          .setLabel(type.label)
          .setStyle(ButtonStyle.Secondary),
      ),
    ),
  ];
}

function createSupportTicketSelect() {
  const emojis = {
    general: "🛟",
    report: "⚠️",
    partnership: "🤝",
    appeal: "📄",
    staff_contact: "🔒",
  };

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SUPPORT_TICKET_SELECT_ID)
      .setPlaceholder("What do you need help with?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        Object.entries(ticketTypes).map(([key, type]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(type.label)
            .setDescription(type.description.slice(0, 100))
            .setEmoji(emojis[key])
            .setValue(key),
        ),
      ),
  );
}

function createSupportTicketModal(typeKey) {
  const type = ticketTypes[typeKey];
  if (!type) {
    throw new Error(`Unknown support ticket type: ${typeKey}`);
  }

  return new ModalBuilder()
    .setCustomId(`${SUPPORT_TICKET_MODAL_PREFIX}${typeKey}`)
    .setTitle(type.modalTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SUPPORT_ROBLOX_ID)
          .setLabel("Roblox username")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(80)
          .setRequired(false)
          .setPlaceholder("Optional, but helps staff find context faster"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SUPPORT_SUMMARY_ID)
          .setLabel(type.summaryLabel)
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(120)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SUPPORT_DETAILS_ID)
          .setLabel(type.detailsLabel)
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(1000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SUPPORT_PROOF_ID)
          .setLabel(type.proofLabel)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(false),
      ),
    );
}

function createTicketOpenedMessage({ ticket, opener, targetUser }) {
  const type = Object.values(ticketTypes).find((entry) => entry.title === ticket.type);
  const accent = type?.accent || accentColor;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accent)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### OSRP | ${ticket.type}`),
          new TextDisplayBuilder().setContent([
            `> Opened by: <@${opener.id}>`,
            `> Roblox: **${ticket.robloxUsername || "Not provided"}**`,
            `> Status: **${ticket.status}** • Priority: **${ticket.priority || "Normal"}**`,
          ].join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${ticket.summary}`),
          new TextDisplayBuilder().setContent(ticket.details),
          new TextDisplayBuilder().setContent(`### Evidence / Context\n${ticket.proof || "Nothing attached."}`),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${ticket.ticketId} • Keep this ticket focused on the issue above.`),
        ),
    ],
    allowedMentions: { users: [opener.id, targetUser.id] },
  };
}

module.exports = {
  SUPPORT_DETAILS_ID,
  SUPPORT_PROOF_ID,
  SUPPORT_ROBLOX_ID,
  SUPPORT_SUMMARY_ID,
  SUPPORT_TICKET_MODAL_PREFIX,
  SUPPORT_TICKET_PREFIX,
  SUPPORT_TICKET_SELECT_ID,
  createSupportTicketButtons,
  createSupportTicketSelect,
  createSupportTicketModal,
  createTicketOpenedMessage,
  ticketTypes,
};
