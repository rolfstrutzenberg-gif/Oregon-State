const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
  createGiveaway,
  endGiveaway,
  findGiveaway,
  parseDuration,
  rerollGiveaway,
  updateGiveaway,
} = require("../services/giveaway-service");
const {
  createGiveawayPanel,
  createGiveawayResultMessage,
} = require("../utils/giveaway-panel");

function resolveGiveawayChannel(guild, optionChannel) {
  if (optionChannel?.isTextBased()) {
    return optionChannel;
  }

  if (process.env.GIVEAWAYS_CHANNEL_ID) {
    const channel = guild.channels.cache.get(process.env.GIVEAWAYS_CHANNEL_ID);
    if (channel?.isTextBased()) {
      return channel;
    }
  }

  return guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildText && channel.name === "🎉｜giveaways"
  ) || null;
}

async function updateGiveawayMessage(client, giveaway) {
  if (!giveaway.channelId || !giveaway.messageId) {
    return;
  }

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit(createGiveawayPanel(giveaway)).catch(() => null);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage OSRP giveaways.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a giveaway.")
        .addStringOption((option) =>
          option
            .setName("prize")
            .setDescription("Prize shown on the giveaway panel.")
            .setRequired(true)
            .setMaxLength(120),
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Number of winners.")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("Optional duration, like 30m, 12h, or 7d.")
            .setRequired(false)
            .setMaxLength(20),
        )
        .addStringOption((option) =>
          option
            .setName("requirements")
            .setDescription("Short entry requirements.")
            .setRequired(false)
            .setMaxLength(300),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Where to post it. Defaults to giveaways.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("require_verified")
            .setDescription("Require verified/rules-complete members to enter. Default: true.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway and draw winners.")
        .addStringOption((option) =>
          option
            .setName("giveaway_id")
            .setDescription("Giveaway ID, like G-0001.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reroll")
        .setDescription("Draw replacement winner(s).")
        .addStringOption((option) =>
          option
            .setName("giveaway_id")
            .setDescription("Giveaway ID, like G-0001.")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Replacement winners to draw.")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("View giveaway status.")
        .addStringOption((option) =>
          option
            .setName("giveaway_id")
            .setDescription("Giveaway ID, like G-0001.")
            .setRequired(true),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.guild.channels.fetch().catch(() => null);

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const duration = interaction.options.getString("duration");
      const endsAt = parseDuration(duration);
      if (duration && !endsAt) {
        await interaction.editReply("Use a duration like `30m`, `12h`, or `7d`.");
        return;
      }

      const channel = resolveGiveawayChannel(interaction.guild, interaction.options.getChannel("channel"));
      if (!channel?.isTextBased()) {
        await interaction.editReply("The giveaways channel is missing or is not a text channel.");
        return;
      }

      const giveaway = createGiveaway({
        prize: interaction.options.getString("prize"),
        winnerCount: interaction.options.getInteger("winners") || 1,
        requirements: interaction.options.getString("requirements") || "Must be verified and follow all server rules.",
        endsAt,
        requireVerified: interaction.options.getBoolean("require_verified") ?? true,
        hostUser: interaction.user,
        channelId: channel.id,
      });

      const message = await channel.send(createGiveawayPanel(giveaway));
      const updated = updateGiveaway(giveaway.giveawayId, { messageId: message.id });
      await message.edit(createGiveawayPanel(updated));

      await interaction.editReply(`Giveaway posted in <#${channel.id}> as ${giveaway.giveawayId}.`);
      return;
    }

    if (subcommand === "end") {
      const giveawayId = interaction.options.getString("giveaway_id").toUpperCase();
      const result = endGiveaway(giveawayId);
      if (!result.ok) {
        await interaction.editReply(result.reason === "missing" ? "Giveaway not found." : "That giveaway is already ended.");
        return;
      }

      await updateGiveawayMessage(interaction.client, result.giveaway);
      const channel = result.giveaway.channelId
        ? await interaction.client.channels.fetch(result.giveaway.channelId).catch(() => null)
        : null;
      if (channel?.isTextBased()) {
        await channel.send(createGiveawayResultMessage(result.giveaway));
      }

      await interaction.editReply(`Giveaway ${giveawayId} ended.`);
      return;
    }

    if (subcommand === "reroll") {
      const giveawayId = interaction.options.getString("giveaway_id").toUpperCase();
      const count = interaction.options.getInteger("winners") || 1;
      const result = rerollGiveaway(giveawayId, count);
      if (!result.ok) {
        await interaction.editReply("Giveaway not found.");
        return;
      }

      const channel = result.giveaway.channelId
        ? await interaction.client.channels.fetch(result.giveaway.channelId).catch(() => null)
        : null;
      if (channel?.isTextBased()) {
        await channel.send(createGiveawayResultMessage(result.giveaway, result.winners));
      }

      await interaction.editReply(`Rerolled ${giveawayId}.`);
      return;
    }

    if (subcommand === "status") {
      const giveawayId = interaction.options.getString("giveaway_id").toUpperCase();
      const giveaway = findGiveaway(giveawayId);
      if (!giveaway) {
        await interaction.editReply("Giveaway not found.");
        return;
      }

      await interaction.editReply(`\`${giveaway.giveawayId}\` is ${giveaway.status} with ${giveaway.entries.length} entries.`);
    }
  },
};
