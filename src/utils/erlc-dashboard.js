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

const ERLC_COMMAND_BUTTON_ID = "erlc:command";
const ERLC_REFRESH_MODCALLS_ID = "erlc:modcalls:refresh";
const ERLC_RECENT_COMMANDS_ID = "erlc:commands:recent";
const ERLC_PENDING_MODCALLS_ID = "erlc:modcalls:pending";
const ERLC_COMMAND_MODAL_ID = "erlc:command-modal";
const ERLC_COMMAND_INPUT_ID = "erlc:command-input";
const ERLC_COMMAND_REASON_ID = "erlc:command-reason";
const ERLC_MODCALL_RESPOND_PREFIX = "erlc:modcall:respond:";

function footer() {
  return "-# Oregon State Roleplay • EST 2026";
}

function createErlcDashboardMessage() {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## ER:LC Control"),
          new TextDisplayBuilder().setContent("Run server commands, review mod calls, and keep every action logged."),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(ERLC_COMMAND_BUTTON_ID)
              .setLabel("Run Command")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(ERLC_REFRESH_MODCALLS_ID)
              .setLabel("Refresh Mod Calls")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(ERLC_PENDING_MODCALLS_ID)
              .setLabel("Pending Calls")
              .setStyle(ButtonStyle.Secondary),
          ),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(ERLC_RECENT_COMMANDS_ID)
              .setLabel("Recent Commands")
              .setStyle(ButtonStyle.Secondary),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(footer()),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createErlcCommandModal() {
  return new ModalBuilder()
    .setCustomId(ERLC_COMMAND_MODAL_ID)
    .setTitle("Run ER:LC Command")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(ERLC_COMMAND_INPUT_ID)
          .setLabel("Command")
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(120)
          .setRequired(true)
          .setPlaceholder("h Session is starting"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(ERLC_COMMAND_REASON_ID)
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(2)
          .setMaxLength(400)
          .setRequired(true)
          .setPlaceholder("Why is this command being sent?"),
      ),
    );
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  const seconds = timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
  return `<t:${seconds}:R>`;
}

function createModCallMessage(modCall) {
  const responded = modCall.status === "Responded";
  const lines = [
    `Caller: ${modCall.callerUsername || "Unknown"}`,
    `Roblox ID: ${modCall.callerRobloxUserId || "Unknown"}`,
    `Status: ${modCall.status}`,
    `Received: ${formatTimestamp(modCall.timestamp)}`,
    modCall.responderDiscordUserId ? `Responder: <@${modCall.responderDiscordUserId}>` : null,
    modCall.responseCommand ? `Command: \`${modCall.responseCommand}\`` : null,
  ].filter(Boolean);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(responded ? 0x315B33 : 0xC9902F)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## Mod Call"),
          new TextDisplayBuilder().setContent(lines.join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`${ERLC_MODCALL_RESPOND_PREFIX}${modCall.modCallId}`)
              .setLabel(responded ? "Responded" : "Respond")
              .setStyle(responded ? ButtonStyle.Secondary : ButtonStyle.Success)
              .setDisabled(responded),
          ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(footer()),
        ),
    ],
    allowedMentions: { users: modCall.responderDiscordUserId ? [modCall.responderDiscordUserId] : [] },
  };
}

function createCommandLogMessage(record) {
  const success = record.status === "Sent";
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(success ? accentColor : 0xB84A45)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent(success ? "## Command Sent" : "## Command Failed"),
          new TextDisplayBuilder().setContent([
            `Command: \`${record.command}\``,
            `Actor: ${record.actorUserId ? `<@${record.actorUserId}>` : record.actorTag || "Unknown"}`,
            `Source: ${record.source}`,
            record.erlcCommandLoggedAt ? `ER:LC Log: <t:${record.erlcCommandLoggedAt}:R>` : null,
            record.modCallId ? `Mod Call: ${record.modCallId}` : null,
            record.reason ? `Reason: ${record.reason}` : null,
            record.error ? `Error: ${record.error}` : null,
          ].filter(Boolean).join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(footer()),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createRecentCommandsMessage(records) {
  const lines = records.length > 0
    ? records.map((record) => `- ${record.commandId} | ${record.status} | \`${record.command}\` | ${record.actorTag || "Unknown"}`).join("\n")
    : "No command logs yet.";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Recent Commands"),
          new TextDisplayBuilder().setContent(lines),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createPendingModCallsMessage(modCalls) {
  const lines = modCalls.length > 0
    ? modCalls.map((call) => `- ${call.modCallId} | ${call.callerUsername || "Unknown"} | ${call.callerRobloxUserId || "No ID"} | ${formatTimestamp(call.timestamp)}`).join("\n")
    : "No pending mod calls.";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Pending Mod Calls"),
          new TextDisplayBuilder().setContent(lines),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  ERLC_COMMAND_BUTTON_ID,
  ERLC_COMMAND_INPUT_ID,
  ERLC_COMMAND_MODAL_ID,
  ERLC_COMMAND_REASON_ID,
  ERLC_MODCALL_RESPOND_PREFIX,
  ERLC_PENDING_MODCALLS_ID,
  ERLC_RECENT_COMMANDS_ID,
  ERLC_REFRESH_MODCALLS_ID,
  createCommandLogMessage,
  createErlcCommandModal,
  createErlcDashboardMessage,
  createModCallMessage,
  createPendingModCallsMessage,
  createRecentCommandsMessage,
};
