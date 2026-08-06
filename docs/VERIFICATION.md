# OSRP Roblox Verification

## Flow

1. A member clicks **Start Verification** in Discord.
2. The bot replies ephemerally with a signed link bound to that Discord user and guild. The link expires after ten minutes.
3. Vercel validates the signature and starts Roblox OAuth.
4. Roblox returns the member to `/api/roblox/callback`.
5. Vercel securely queues the Discord identity and Roblox profile in the Cloudflare relay.
6. The bot claims the event, rejects duplicate links, stores the verification, moves the member to **Pending Rules**, logs the result, and DMs the Rules button.
7. Vercel waits briefly for the bot result so account conflicts and missing members still receive the correct error page.
8. Accepting the rules grants **Verified Community Member** and removes onboarding roles.

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
VERIFICATION_RELAY_URL=https://osrp-verification-relay.rolfstrutzenberg.workers.dev/
VERIFICATION_RELAY_POLL_INTERVAL_MS=1000
```

## Vercel Environment

```text
ROBLOX_OAUTH_CLIENT_ID=
ROBLOX_OAUTH_CLIENT_SECRET=
ROBLOX_OAUTH_REDIRECT_URI=https://oregon-state-verification.vercel.app/api/roblox/callback
ROBLOX_OAUTH_SCOPES=openid profile
BOT_VERIFICATION_CALLBACK_URL=https://osrp-verification-relay.rolfstrutzenberg.workers.dev/verification/callback
BOT_VERIFICATION_CALLBACK_SECRET=
SUCCESS_REDIRECT_URL=
```

`BOT_VERIFICATION_CALLBACK_SECRET` must be the same long random value in the bot and Vercel environments. Never commit it.

## External Setup

- Add the exact redirect URI to the Roblox OAuth application.
- Deploy `cloudflare/verification-relay` and apply its D1 migration.
- Set the Worker secret `VERIFICATION_RELAY_SECRET` to the same value as `BOT_VERIFICATION_CALLBACK_SECRET`.
- Give the Discord bot permission to manage the three onboarding roles.
- Keep the bot's highest role above those roles.
- Enable the Server Members Intent in the Discord Developer Portal.
- Redeploy Vercel after changing its environment variables.
- Redeploy Discord commands after replacing the bot token.
