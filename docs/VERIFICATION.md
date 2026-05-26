# Verification Plan

## Goal

Build a Roblox-backed verification flow that links:

- Discord user ID
- Roblox user ID
- Roblox username
- Roblox display name
- verification timestamp

This gives us a clean identity record now so ERLC integration can cross-reference the same Roblox account later.

## Current Foundation

The bot now supports:

- a verification panel deployment command
- a verification status lookup command
- persistent verification storage in `data/verifications.json`
- environment placeholders for Roblox OAuth and panel URLs

## What Is Still Needed

To finish live Roblox verification, we still need:

- Roblox OAuth app client ID
- Roblox OAuth app client secret
- Roblox OAuth redirect URI
- a public verification portal URL that Roblox can redirect back to

## Recommended Flow

1. User clicks the verification button in Discord.
2. User is sent to the verification portal.
3. Portal starts Roblox OAuth 2.0 / OIDC.
4. Portal receives Roblox user info.
5. Portal writes the verified Roblox identity back to the bot datastore.
6. Bot grants verified roles and logs the verification event.

## Roblox Data To Store

- `discordUserId`
- `discordTag`
- `robloxUserId`
- `robloxUsername`
- `robloxDisplayName`
- `verifiedAt`
- `provider`
- `notes`

## Why OAuth 2.0

Roblox's official Open Cloud authentication uses OAuth 2.0 with OpenID Connect. The official docs say the `openid` scope is required for identity and `profile` gives access to public profile details such as user IDs and usernames.
