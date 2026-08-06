const crypto = require("node:crypto");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadVerificationConfig } = require("../services/verification-config");
const { panelDivider } = require("./panel-style");

const VERIFICATION_START_BUTTON_ID = "verification:start";
const LINK_LIFETIME_SECONDS = 10 * 60;

function signLaunch({ discordUserId, guildId, expiresAt }, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${discordUserId}.${guildId}.${expiresAt}`)
    .digest("base64url");
}

function createVerificationLaunchUrl({ discordUserId, guildId, now = Date.now() }) {
  const config = loadVerificationConfig();
  if (!config.verifyPortalUrl || !config.callbackSecret) {
    throw new Error("Roblox verification is not fully configured.");
  }

  const expiresAt = Math.floor(now / 1000) + LINK_LIFETIME_SECONDS;
  const signature = signLaunch(
    { discordUserId, guildId, expiresAt },
    config.callbackSecret,
  );
  const url = new URL(config.verifyPortalUrl);
  url.searchParams.set("discord_user_id", discordUserId);
  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", signature);
  return url.toString();
}

function createVerificationLaunchMessage({ discordUserId, guildId }) {
  const url = createVerificationLaunchUrl({ discordUserId, guildId });

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Continue to Roblox"),
          new TextDisplayBuilder().setContent(
            "This link is tied to your Discord account and expires in 10 minutes.",
          ),
        )
        .addSeparatorComponents(panelDivider())
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Verify with Roblox →")
              .setStyle(ButtonStyle.Link)
              .setURL(url),
          ),
        ),
    ],
  };
}

module.exports = {
  LINK_LIFETIME_SECONDS,
  VERIFICATION_START_BUTTON_ID,
  createVerificationLaunchMessage,
  createVerificationLaunchUrl,
  signLaunch,
};
