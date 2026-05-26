const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

const CASE_DASHBOARD_SEARCH_ID = "casefiles:search";
const CASE_DASHBOARD_RECENT_ID = "casefiles:recent";
const CASE_DASHBOARD_REQUESTS_ID = "casefiles:requests";
const CASE_FILE_REQUEST_ID = "casefile:request";
const CASE_FILE_VIEW_ID = "casefile:view";
const TICKET_CLOSE_ID = "ticket:close";
const TICKET_CLOSE_MODAL_ID = "ticket:close-modal";
const TICKET_CLOSE_SUMMARY_ID = "ticket:close-summary";
const TICKET_CLOSE_ACTION_ID = "ticket:close-action";
const TICKET_CLOSE_RESULT_ID = "ticket:close-result";
const CASE_FILE_REQUEST_MODAL_ID = "casefile:request-modal";
const CASE_FILE_REQUEST_REASON_ID = "casefile:request-reason";
const CASE_FILE_APPROVE_PREFIX = "casefile:approve:";
const CASE_FILE_DENY_PREFIX = "casefile:deny:";

function createCaseFilesDashboardMessage() {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## Case Files"),
          new TextDisplayBuilder().setContent("Search, review, and manage private case file access."),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(CASE_DASHBOARD_SEARCH_ID)
              .setLabel("Search User")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(CASE_DASHBOARD_RECENT_ID)
              .setLabel("Recent Files")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(CASE_DASHBOARD_REQUESTS_ID)
              .setLabel("Access Requests")
              .setStyle(ButtonStyle.Secondary),
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

function createTicketControlsMessage(targetUser) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Staff Controls"),
          new TextDisplayBuilder().setContent(`Case file target: <@${targetUser.id}>`),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(CASE_FILE_REQUEST_ID)
              .setLabel("Request Case File")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(CASE_FILE_VIEW_ID)
              .setLabel("View Case File")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(TICKET_CLOSE_ID)
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Danger),
          ),
        ),
    ],
  };
}

function createCaseFileRequestModal() {
  return new ModalBuilder()
    .setCustomId(CASE_FILE_REQUEST_MODAL_ID)
    .setTitle("Request Case File")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CASE_FILE_REQUEST_REASON_ID)
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(800)
          .setRequired(true)
          .setPlaceholder("Why is this case file needed for this ticket?"),
      ),
    );
}

function createTicketCloseModal() {
  return new ModalBuilder()
    .setCustomId(TICKET_CLOSE_MODAL_ID)
    .setTitle("Close Ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CLOSE_SUMMARY_ID)
          .setLabel("Summary")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(1000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CLOSE_ACTION_ID)
          .setLabel("Action Taken")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(800)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CLOSE_RESULT_ID)
          .setLabel("Result")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(120)
          .setRequired(true)
          .setPlaceholder("Strike, warning, termination, ban, blacklist, or other"),
      ),
    );
}

function createCaseFileSummaryMessage({ caseFile, incidents, title = "Case File" }) {
  const incidentLines = incidents.length > 0
    ? incidents.slice(-8).map((incident) => `- ${incident.incidentId} | ${incident.type} | ${incident.status} | ${incident.reason}`).join("\n")
    : "No incidents recorded.";
  const memberLine = [
    `Mention: <@${caseFile.userId}>`,
    `Discord: ${caseFile.tag || caseFile.username}`,
    `Display: ${caseFile.displayName || "Unknown"}`,
    `User ID: ${caseFile.userId}`,
  ].join("\n");

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### OSRP | ${title}`),
          new TextDisplayBuilder().setContent(`## ${caseFile.tag || caseFile.username}`),
          new TextDisplayBuilder().setContent(`Case File: ${caseFile.caseFileId}\n${memberLine}`),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Incidents\n${incidentLines}`),
        ),
    ],
  };
}

function createAccessRequestMessage(request) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Case File Access Request"),
          new TextDisplayBuilder().setContent(`Request: ${request.requestId}`),
          new TextDisplayBuilder().setContent(`Requester: <@${request.requesterUserId}>\nTarget: <@${request.targetUserId}>\nTicket: <#${request.ticketChannelId}>`),
          new TextDisplayBuilder().setContent(`Reason\n${request.reason}`),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`${CASE_FILE_APPROVE_PREFIX}${request.requestId}`)
              .setLabel("Approve")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`${CASE_FILE_DENY_PREFIX}${request.requestId}`)
              .setLabel("Deny")
              .setStyle(ButtonStyle.Danger),
          ),
        ),
    ],
  };
}

module.exports = {
  CASE_DASHBOARD_RECENT_ID,
  CASE_DASHBOARD_REQUESTS_ID,
  CASE_DASHBOARD_SEARCH_ID,
  CASE_FILE_APPROVE_PREFIX,
  CASE_FILE_DENY_PREFIX,
  CASE_FILE_REQUEST_ID,
  CASE_FILE_REQUEST_MODAL_ID,
  CASE_FILE_REQUEST_REASON_ID,
  CASE_FILE_VIEW_ID,
  TICKET_CLOSE_ACTION_ID,
  TICKET_CLOSE_ID,
  TICKET_CLOSE_MODAL_ID,
  TICKET_CLOSE_RESULT_ID,
  TICKET_CLOSE_SUMMARY_ID,
  createAccessRequestMessage,
  createCaseFileRequestModal,
  createCaseFileSummaryMessage,
  createCaseFilesDashboardMessage,
  createTicketControlsMessage,
  createTicketCloseModal,
};
