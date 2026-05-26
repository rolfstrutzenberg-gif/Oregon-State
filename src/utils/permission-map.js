const { PermissionsBitField } = require("discord.js");

const permissionNameMap = new Map([
  ["View Channel", "ViewChannel"],
  ["View Channels", "ViewChannel"],
  ["Create Invite", "CreateInstantInvite"],
  ["Create Instant Invite", "CreateInstantInvite"],
  ["Change Nickname", "ChangeNickname"],
  ["Send Messages", "SendMessages"],
  ["Send Messages in Threads", "SendMessagesInThreads"],
  ["Send Polls", "SendPolls"],
  ["Embed Links", "EmbedLinks"],
  ["Attach Files", "AttachFiles"],
  ["Add Reactions", "AddReactions"],
  ["Read Message History", "ReadMessageHistory"],
  ["Use Application Commands", "UseApplicationCommands"],
  ["Use External Emoji", "UseExternalEmojis"],
  ["Use External Emojis", "UseExternalEmojis"],
  ["Use External Stickers", "UseExternalStickers"],
  ["Connect", "Connect"],
  ["Speak", "Speak"],
  ["Stream", "Stream"],
  ["Use Voice Activity", "UseVAD"],
  ["Request to Speak", "RequestToSpeak"],
  ["Create Private Threads", "CreatePrivateThreads"],
  ["Create Public Threads", "CreatePublicThreads"],
  ["Manage Messages", "ManageMessages"],
  ["Manage Threads", "ManageThreads"],
  ["Moderate Members", "ModerateMembers"],
  ["Kick Members", "KickMembers"],
  ["Ban Members", "BanMembers"],
  ["Manage Nicknames", "ManageNicknames"],
  ["Mute Members", "MuteMembers"],
  ["Move Members", "MoveMembers"],
  ["Deafen Members", "DeafenMembers"],
  ["Priority Speaker", "PrioritySpeaker"],
  ["View Audit Log", "ViewAuditLog"],
  ["Create Events", "CreateEvents"],
  ["Manage Events", "ManageEvents"],
  ["Manage Channels", "ManageChannels"],
  ["Mention @everyone", "MentionEveryone"],
  ["Manage Roles", "ManageRoles"],
  ["Manage Webhooks", "ManageWebhooks"],
  ["Manage Server", "ManageGuild"],
  ["View Server Insights", "ViewGuildInsights"],
  ["Manage Emojis and Stickers", "ManageEmojisAndStickers"],
  ["Manage Expressions", "ManageGuildExpressions"],
  ["Administrator", "Administrator"],
  ["Bypass Slowmode", "BypassSlowmode"],
  ["Pin Messages", "PinMessages"],
  ["Use Soundboard", "UseSoundboard"],
  ["Use External Sounds", "UseExternalSounds"],
  ["Send Voice Messages", "SendVoiceMessages"]
]);

const ignoredPermissionNames = new Set([
  "Set Voice Channel Status",
]);

function normalizePermissionList(permissionText) {
  if (!permissionText || permissionText.trim() === "None") {
    return [];
  }

  return permissionText
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean)
    .map((permission) => {
      const normalized = permission
        .replace(/\s*\/.*$/u, "")
        .trim();

      if (ignoredPermissionNames.has(normalized)) {
        return null;
      }

      const flagName = permissionNameMap.get(normalized);

      if (!flagName || !(flagName in PermissionsBitField.Flags)) {
        throw new Error(`Unsupported permission name: ${permission}`);
      }

      return PermissionsBitField.Flags[flagName];
    })
    .filter(Boolean);
}

module.exports = {
  normalizePermissionList,
};
