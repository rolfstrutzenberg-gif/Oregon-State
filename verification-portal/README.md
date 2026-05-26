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
ROBLOX_OAUTH_REDIRECT_URI=https://your-project.vercel.app/api/roblox/callback
ROBLOX_OAUTH_SCOPES=openid profile
SUCCESS_REDIRECT_URL=
BOT_VERIFICATION_CALLBACK_URL=
BOT_VERIFICATION_CALLBACK_SECRET=
```

## Roblox OAuth App

Use this redirect URI in the Roblox OAuth app:

```text
https://your-project.vercel.app/api/roblox/callback
```

## Current Limitation

This portal can complete Roblox OAuth and read the Roblox user profile. The next bridge is tying a Discord user ID to the OAuth session so the bot knows exactly which Discord member to update after Roblox redirects back.
