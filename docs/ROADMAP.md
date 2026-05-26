# Roadmap

## Core Principle

Build the bot in layers that stay understandable:

1. stable bot framework
2. shared styling system
3. reusable service modules
4. feature configs
5. premium user-facing panels

Do not skip ahead by hardcoding feature logic directly into command files if that logic will be reused later.

## Phase 1: Foundation

- environment validation
- command loader
- event loader
- shared embed factory
- startup logging
- slash command deployment

## Phase 2: Essential Utility

- health/status commands
- server info command
- permissions checks
- error handling patterns
- config-driven behavior

## Phase 3: Self-Role System

- role panel config schema
- panel deployment command
- select menu role toggles
- channel targeting
- role hierarchy safeguards
- ephemeral success and failure responses

## Phase 4: Presentation Quality

- branded banner assets
- cleaner copywriting
- stronger visual hierarchy
- multi-panel layouts when needed
- mobile-first layout testing

## Phase 5: Expansion

- welcome systems
- moderation utilities
- logging
- ticketing or applications if needed

Each new feature should answer:

- Can this be config-driven?
- Can this logic live in a service?
- Does this match the polished UI direction?
- Will this stay understandable six weeks from now?
