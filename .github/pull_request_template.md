## What this PR does
<!-- One or two sentences. -->

Closes #

**Requirements covered (SRS IDs):**

## Changes
**Owned files (from the slice card):**
-

**Shared files touched:**
- [ ] none
- [ ] `en.json` / `bn.json` (keys added, alphabetical, slice namespace only)
- [ ] `admin-nav.tsx` (one link added)
- [ ] `package.json` / lockfile (new dependency: )
- [ ] `.env.example` (new variable: )
- [ ] `docs/DECISIONS.md` (line appended)
- [ ] schema / migration (**Contains migration**: explain below)

**Anything changed from the plan or left for later:**

## How to test
<!-- Steps a reviewer follows locally. Mirror the slice card's "Done when" list. -->
1.

## Checklist
- [ ] Branch is rebased on the latest `main`
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally, and CI is green
- [ ] Every "Done when" item in the slice card is met
- [ ] Every admin page and admin action calls `requireOwner()` first
- [ ] Mutations go through server actions with Zod validation
- [ ] No prices shown anywhere
- [ ] All visible text uses `t()` keys
- [ ] Public forms use Turnstile
- [ ] Works at phone width and by keyboard
- [ ] No secrets, `.env.local`, or AI-tool attribution in the diff or commit messages
