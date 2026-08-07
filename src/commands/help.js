const { SlashCommandBuilder } = require("discord.js");
const { replyPanel } = require("../utils/command-response");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View Oregon State Systems commands."),
  async execute(interaction) {
    await replyPanel(interaction, {
      title: "Oregon State Systems",
      description: "Commands are grouped below so you can find what you need quickly.",
      lines: [
        "### Moderation",
        "`/kick` `/ban` `/unban` `/softban` `/mute` `/unmute` `/strike`",
        "`/blacklist` `/unblacklist` `/purge` `/slowmode` `/lock` `/unlock` `/nickname` `/role`",
        "### Information",
        "`/whois` `/avatar` `/serverinfo` `/roleinfo` `/channelinfo` `/verify-status`",
        "`/roblox` `/membercount` `/staff` `/status`",
        "### Community",
        "`/poll` `/remindme` `/8ball` `/coinflip` `/dice` `/choose` `/randomnumber` `/rps` `/slots`",
        "### Staff Systems",
        "`/announce` `/panel` `/session` `/giveaway` `/ticket` `/case-dashboard` `/erlc-dashboard`",
      ],
      footer: "Use / and select a command to view its options",
    });
  },
};
