const { Events } = require("discord.js");
const { defaultChannelNames, loadWelcomeConfig } = require("../services/welcome-config");
const { createLogger } = require("../utils/logger");
const { buildWelcomeJoinMessage } = require("../utils/welcome-join-message");

const logger = createLogger("guild-member-add");

function resolveWelcomeChannel(member, config) {
  if (config.channelId) {
    return member.guild.channels.cache.get(config.channelId) || null;
  }

  return member.guild.channels.cache.find((channel) => channel.name === defaultChannelNames.welcome) || null;
}

function resolveUnverifiedRole(member) {
  if (process.env.UNVERIFIED_ROLE_ID) {
    return member.guild.roles.cache.get(process.env.UNVERIFIED_ROLE_ID) || null;
  }

  return member.guild.roles.cache.find((role) => role.name === "➟ Unverified") || null;
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const config = loadWelcomeConfig();
    await member.guild.channels.fetch().catch(() => null);
    await member.guild.roles.fetch().catch(() => null);

    const unverifiedRole = resolveUnverifiedRole(member);
    if (unverifiedRole && !member.roles.cache.has(unverifiedRole.id)) {
      await member.roles.add(unverifiedRole, "Assign unverified role on join").catch((error) => {
        logger.error("Failed to assign unverified role on join.", error);
      });
    }

    const channel = resolveWelcomeChannel(member, config);

    if (!channel || !channel.isTextBased()) {
      logger.error("Welcome channel is missing or not text-based.");
      return;
    }

    const message = buildWelcomeJoinMessage(member);
    await channel.send({
      components: message.components,
      files: message.files,
      flags: message.flags,
      allowedMentions: message.allowedMentions,
    });
  },
};
