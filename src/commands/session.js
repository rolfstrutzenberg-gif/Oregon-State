const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
  closeSession,
  createSessionVote,
  getActiveSession,
  openSession,
  recentSessions,
} = require("../services/session-service");
const { logSessionEvent } = require("../services/session-log-service");
const {
  createSessionClosedPanel,
  createSessionOpenPanel,
  createSessionStatusMessage,
  createSessionVotePanel,
} = require("../utils/sessions-panel");

function resolveSessionsChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("session")
    .setDescription("Manage Oregon State Roleplay sessions.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription("Open a session.")
        .addStringOption((option) =>
          option
            .setName("notes")
            .setDescription("Short notes for the session panel.")
            .setRequired(false)
            .setMaxLength(300),
        )
        .addStringOption((option) =>
          option
            .setName("join_url")
            .setDescription("Session join URL. Defaults to ERLC_SERVER_URL or roblox.com.")
            .setRequired(false),
        )
        .addRoleOption((option) =>
          option
            .setName("ping_role")
            .setDescription("Optional role to ping for this session.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close the active session.")
        .addStringOption((option) =>
          option
            .setName("notes")
            .setDescription("Optional closing notes.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("vote")
        .setDescription("Start a session interest vote.")
        .addStringOption((option) =>
          option
            .setName("notes")
            .setDescription("Optional notes for the vote.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("View active and recent sessions."),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.guild.channels.fetch().catch(() => null);

    const subcommand = interaction.options.getSubcommand();
    const targetChannel = resolveSessionsChannel(
      interaction.guild,
      process.env.SESSIONS_CHANNEL_ID,
      "🛰️｜sessions",
    ) || interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.editReply("The sessions channel is missing or is not a text channel.");
      return;
    }

    if (subcommand === "open") {
      const notes = interaction.options.getString("notes");
      const joinUrl = interaction.options.getString("join_url") || process.env.ERLC_SERVER_URL || "https://roblox.com";
      const pingRole = interaction.options.getRole("ping_role");
      const result = openSession({
        hostUser: interaction.user,
        notes,
        joinUrl,
        pingRoleId: pingRole?.id || null,
      });

      if (!result.created) {
        await interaction.editReply(`A session is already open: ${result.session.sessionId}. Close it before opening another.`);
        return;
      }

      await targetChannel.send({
        content: pingRole ? `<@&${pingRole.id}>` : undefined,
        ...createSessionOpenPanel({ guild: interaction.guild, session: result.session }),
      });
      await logSessionEvent(interaction.guild, `Session opened: ${result.session.sessionId} by ${interaction.user.tag}`);
      await interaction.editReply(`Session opened in <#${targetChannel.id}>.`);
      return;
    }

    if (subcommand === "close") {
      const notes = interaction.options.getString("notes");
      const closed = closeSession({
        closedByUser: interaction.user,
        notes,
      });

      if (!closed) {
        await interaction.editReply("There is no active session to close.");
        return;
      }

      await targetChannel.send(createSessionClosedPanel({ session: closed }));
      await logSessionEvent(interaction.guild, `Session closed: ${closed.sessionId} by ${interaction.user.tag}`);
      await interaction.editReply(`Session ${closed.sessionId} closed.`);
      return;
    }

    if (subcommand === "vote") {
      const notes = interaction.options.getString("notes");
      const vote = createSessionVote({
        hostUser: interaction.user,
        notes,
      });

      await targetChannel.send(createSessionVotePanel({ vote }));
      await logSessionEvent(interaction.guild, `Session vote started: ${vote.voteId} by ${interaction.user.tag}`);
      await interaction.editReply(`Session vote posted in <#${targetChannel.id}>.`);
      return;
    }

    if (subcommand === "status") {
      await interaction.editReply(createSessionStatusMessage({
        activeSession: getActiveSession(),
        recentSessions: recentSessions(),
      }));
    }
  },
};
