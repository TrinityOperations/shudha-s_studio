# Slice #16: Handover: owner's guide and training

**GitHub issue:** #16 · **Branch:** `feat/16-handover` · **i18n namespace:** `admin.help.*`

## Goal
The owner can run the site alone, and every account she needs is in her name.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| OD-50 | Plain-language help text inside the dashboard | M |
| OD-51 | Short owner's guide and a walkthrough session | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #15 Quality pass (merged)

## Files you own (create and change freely)
- Help text components in the dashboard
- `docs/owner-guide.md` (or PDF) with screenshots
- `docs/runbook.md` for the team

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- Admin pages: add help text only
- `docs/DECISIONS.md`

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** None.
- **Schema changes:** None.

## Build plan
1. Plain-language help text on every dashboard screen.
2. Owner's guide: add a product, manage bookings, change theme, approve gallery photos, edit pages.
3. Runbook: deploy, backups, rotating keys, Supabase keep-alive, transferring accounts.
4. Walkthrough session with the client; transfer domain, hosting, Supabase and Resend to her accounts.

## Watch out for
- Never send credentials by email or chat; use a password manager share.

## Needs client input
Training format (live, recorded, written).

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] Client adds a product and confirms a booking unaided
- [ ] All accounts owned by or transferred to the client
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Project complete.
