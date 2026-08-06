# OSRP Roblox Verification

## Flow

1. A member clicks **Start Verification** in Discord.
2. The bot replies ephemerally with a signed link bound to that Discord user and guild. The link expires after ten minutes.
3. Vercel validates the signature and starts Roblox OAuth.
4. Roblox returns the member to `/api/roblox/callback`.
5. Vercel sends the Discord identity and Roblox profile to the bot's public `/verification/callback` endpoint.
6. The bot rejects duplicate links, stores the verification, moves the member to **Pending Rules**, logs the result, and DMs the Rules button.
7. Accepting the rules grants **Verified Community Member** and removes onboarding roles.

## Bot Environment

```text
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
VERIFY_CHANNEL_ID=
VERIFY_LOG_CHANNEL_ID=
UNVERIFIED_ROLE_ID=
VERIFIED_ROLE_ID=
PENDING_RULES_ROLE_ID=
RULES_CHANNEL_ID=
VERIFY_PORTAL_URL=https://oregon-state-verification.vercel.app/api/roblox/start
BOT_VERIFICATION_CALLBACK_SECRET=
VERIFICATION_CALLBACK_PORT=3001
```

## Vercel Environment

```text
ROBLOX_OAUTH_CLIENT_ID=
ROBLOX_OAUTH_CLIENT_SECRET=
ROBLOX_OAUTH_REDIRECT_URI=https://oregon-state-verification.vercel.app/api/roblox/callback
ROBLOX_OAUTH_SCOPES=openid profile
BOT_VERIFICATION_CALLBACK_URL=https://YOUR-PUBLIC-BOT-HOST/verification/callback
BOT_VERIFICATION_CALLBACK_SECRET=
SUCCESS_REDIRECT_URL=
```

`BOT_VERIFICATION_CALLBACK_SECRET` must be the same long random value in the bot and Vercel environments. Never commit it.

## External Setup

- Add the exact redirect URI to the Roblox OAuth application.
- Expose port `3001` through the bot's HTTPS host or tunnel.
- Give the Discord bot permission to manage the three onboarding roles.
- Keep the bot's highest role above those roles.
- Enable the Server Members Intent in the Discord Developer Portal.
- Redeploy Vercel after changing its environment variables.
- Redeploy Discord commands after replacing the bot token.
