# Oregon State Bot

## Priority

The highest current priority for this project is building polished, modern Discord role panels and embeds that look much closer to branded UI cards than basic legacy embeds.

## Current Framework

This repository now includes a structured Discord bot foundation with:

- environment-based config
- startup validation
- file-based command loading
- file-based event loading
- shared embed styling
- slash command registration payloads
- basic utility commands
- interaction routing

## Next Steps

1. Install dependencies with `npm i`.
2. Copy `.env.example` to `.env` and fill in the bot values.
3. Register slash commands with `npm run deploy:commands`.
4. Prepare `config/layout.txt` and preview it with `npm run import:layout -- --dry-run`.
5. Apply the layout with `npm run import:layout -- --apply`.
6. Build the first config-driven self-role panel deployment command.

## First Feature Target

We are aiming for a polished self-role experience with:

- branded banner images
- short, clean copy
- dropdown role selection
- reliable add/remove role logic
- mobile-friendly layout

## Architecture Direction

The framework is intentionally being organized now so later features do not become tangled:

- commands stay thin
- reusable logic moves into services and utilities
- shared visual style lives in one place
- future role-panel behavior should be config-driven

See [docs/ROADMAP.md](./docs/ROADMAP.md) for the build sequence.

## Layout Importer

The project now includes a small layout importer for roles and channels.

- Input file: `config/layout.txt`
- Example file: `config/layout.example.txt`
- Default mode: dry-run
- Apply mode: `npm run import:layout -- --apply`

Supported right now:

- role creation
- category creation
- text channel creation
- voice channel creation
- emoji-preserving text channel names

Permissions are intentionally not hardcoded yet. Once your matrix is ready, we can add overwrite support cleanly without rewriting the importer.

## Role Matrix Importer

The project now also includes a role matrix importer for the block-style permission file.

- Input file: `config/role-matrix.txt`
- Run preview: `npm run import:roles`
- Apply roles: `npm run import:roles -- --apply`
- Custom file path: `npm run import:roles -- --file=/absolute/path/to/matrix.txt --apply`

Supported right now:

- role creation
- role updates
- duplicate divider-role handling by occurrence
- role colors
- hoist and mentionable flags
- global permission parsing
- role ordering under the bot's highest role

Channel-specific overrides are still a separate next step once the permission matrix for channels is finished.

## Channel Matrix Importer

The project now includes a first-pass channel matrix importer for category-level overwrites.

- Input file: `config/channel-matrix.txt`
- Run preview: `npm run import:channels`
- Apply overwrites: `npm run import:channels -- --apply`
- Custom file path: `npm run import:channels -- --file=/absolute/path/to/matrix.txt --apply`

Supported right now:

- category overwrite parsing
- `@everyone` overwrite support
- special mapping for `Unverified / No Verified Role` to `➟ Unverified`
- sync child channels to category permissions
- dynamic ticket template capture for the next ticket system pass

Current limitation:

- this importer applies category permissions and inherits them to child channels
- it does not yet apply explicit per-channel exception blocks because your current file is mostly category-driven

## Safe Apply And Undo

Before any live `--apply` import, the bot now saves a guild snapshot to `backups/`.

- manual snapshot: `npm run snapshot:guild`
- imports with `--apply` automatically snapshot first
- restore from snapshot: `npm run restore:guild -- --label=SNAPSHOT_NAME`

This rollback path is designed for the current import flow:

- role imports
- layout imports
- category permission imports

It restores existing role/channel settings and removes roles/channels that were created after the snapshot.

## Verification Foundation

The repository now includes the first verification foundation for Roblox-linked onboarding.

- `/verify-panel` posts the verification panel
- `/verify-status` checks the stored Roblox identity record for a Discord user
- `/verify-mock` seeds a development record until live OAuth is connected
- persistent records are stored in `data/verifications.json`

For the full live flow, see [docs/VERIFICATION.md](./docs/VERIFICATION.md).
