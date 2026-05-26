# Pre-Release Checklist

## P0: Must Work Before Opening

- Real Roblox OAuth flow is live.
- Verification saves Roblox username and Roblox user ID.
- Verification moves members from `➟ Unverified` to `➟ Pending Rules`.
- The verification completion handoff sends the rules referral message.
- The rules panel is posted and working.
- Members can open both `Discord Rules` and `In-Game Rules` ephemerally.
- Members can accept the rules.
- Accepting the rules grants full access and removes onboarding restrictions.
- Unverified and pending-rules members can only see `ENTRY` and `INFORMATION`.

## P0: Permissions And Safety

- The bot role is above every role it needs to assign or remove.
- Staff, logs, management, and ownership channels are hidden from onboarding roles.
- The rules and verification channels are visible to onboarding roles.
- Slash commands respond cleanly without timing out.

## P0: Logging

- Verification completion is logged.
- Rules acceptance is logged.
- Failed onboarding actions are logged.

## P1: Panel Quality

- `Verification` panel is finalized.
- `Welcome` join card is finalized.
- `Rules` hub is finalized.
- `Self Roles` panel is finalized.

## P1: Content

- Final `Discord Rules` are written.
- Final `In-Game Rules` are written.
- Welcome copy is finalized.
- Verification copy is finalized.

## P1: Launch Testing

- Test a brand-new member from join to full access.
- Test a member who verifies but does not accept rules.
- Test a member who accepts rules without a verification record.
- Test a member who rejoins after already completing onboarding.

## Hosting Direction

- Use a hosted HTTPS callback URL for Roblox OAuth.
- Prefer a free managed subdomain first.
- Add a custom domain later only if you want cleaner branding.

## Recommended Order

1. Build the real Roblox OAuth callback flow.
2. Finalize the rule text.
3. Add verification and rules logs.
4. Run full onboarding tests.
5. Polish the remaining public-facing panels.
