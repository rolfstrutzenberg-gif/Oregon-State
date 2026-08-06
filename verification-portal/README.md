# OSRP Verification Portal

Small Vercel-ready Roblox OAuth portal for Oregon State Roleplay.

## Routes

- `/` redirects to Roblox OAuth.
- `/api/roblox/start` redirects to Roblox OAuth.
- `/api/roblox/callback` receives the Roblox OAuth callback.
- `/api/health` returns a basic health check.

## Vercel Environment Variables

Set these in the Vercel project settings:

```text
ROBLOX_OAUTH_CLIENT_ID=
ROBLOX_OAUTH_CLIENT_SECRET=
ROBLOX_OAUTH_REDIRECT_URI=https://oregon-state-verification.vercel.app/api/roblox/callback
ROBLOX_OAUTH_SCOPES=openid profile
SUCCESS_REDIRECT_URL=
BOT_VERIFICATION_CALLBACK_URL=
BOT_VERIFICATION_CALLBACK_SECRET=
```

## Roblox OAuth App

Use this redirect URI in the Roblox OAuth app:

```text
https://oregon-state-verification.vercel.app/api/roblox/callback
```

## Discord Handoff

The Discord verification button creates a signed, ten-minute launch URL. The portal validates it, preserves the Discord user and guild through Roblox OAuth, then posts the verified Roblox profile to `BOT_VERIFICATION_CALLBACK_URL`.

The callback URL must publicly reach the bot's `/verification/callback` endpoint. Use the same `BOT_VERIFICATION_CALLBACK_SECRET` in the bot and Vercel environments.
