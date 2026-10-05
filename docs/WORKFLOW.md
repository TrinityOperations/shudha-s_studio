# Team workflow: building a slice

How each team member takes one slice from a GitHub issue to a merged pull request, on their own, without clashing with anyone else's work. Written for working with Codex, but the steps are the same with any coding agent.

**Read once before your first slice:** this file, `AGENTS.md` (project rules every agent follows), and `docs/slices/README.md` (the slice map, dependencies and who owns which files).

---

## 0. One-time setup (about 30 minutes)

1. **Tools:** Git, Node 24 (see `.nvmrc`), pnpm 12 (`corepack enable`), and the Codex CLI or IDE extension. Check with `node -v` and `pnpm -v`.
2. **Code:**
   ```
   git clone https://github.com/TrinityOperations/shudha-s_studio.git
   cd shudha-s_studio
   pnpm install
   ```
   Keep the folder name free of spaces and apostrophes.
3. **Your own Supabase dev project** (free). This is what lets everyone work in parallel without breaking each other's data.
   1. supabase.com → New project → name `shudhas-studio-dev-<yourname>`, region **Sydney**.
   2. Copy `.env.example` to `.env.local` and fill it with **your dev project's** URL, publishable key, secret key, and connection strings (transaction pooler on 6543 for `DATABASE_URL`, session pooler on 5432 for `DIRECT_DATABASE_URL`).
   3. For Turnstile, use Cloudflare's always-pass test keys listed in `.env.example`. For `RESEND_API_KEY`, ask the lead for the team key, or leave emails untested until slice #5.
   4. Set `OWNER_EMAIL` to your own email.
   5. Create the database and starting data: `pnpm db:migrate` then `pnpm db:seed`.
   6. Supabase → Authentication → Users → Add user → your `OWNER_EMAIL`, a password, tick **Auto Confirm User**. Then Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
4. **Check it works:** `pnpm dev`, open http://localhost:3000, sign in at `/admin`. Then `pnpm lint && pnpm typecheck && pnpm test`.

Never put real keys in chat, screenshots, issues or commits. `.env.local` is gitignored; keep it that way.

---

## 1. Pick up a slice

1. The lead assigns you a GitHub issue (#2–#16). Open its **slice card** in `docs/slices/` (for example `docs/slices/04-booking-engine.md`). It has everything: goal, SRS requirements, dependencies, the files you own, the shared files you may touch, a build plan, and the "Done when" checklist.
2. Check **Depends on** in the card. Every listed slice must already be merged into `main`. If one isn't, tell the lead before you start.
3. On the GitHub project board, move the issue to **In progress** and make sure you're the assignee.

## 2. Create your branch

```
git switch main
git pull
git switch -c feat/<issue>-<short-name>
```
Use the exact branch name in your card. One slice per branch.

## 3. Start Codex with this prompt

Open Codex in the repo folder. `AGENTS.md` loads automatically. Paste this, filling in the two blanks:

```
We are working on GitHub issue #<N>. Read AGENTS.md, docs/WORKFLOW.md, docs/slices/<NN-file>.md, and the SRS sections listed in that card.

Then propose a plan before writing any code:
- every file you will create or change, grouped as "owned" and "shared"
- any schema or migration change (expected: none) and why
- new dependencies with reasons
- new i18n keys (namespace from the card)
- how each "Done when" item will be met and tested
- open questions

Stay inside the owned paths in the card. Touch shared files only as docs/WORKFLOW.md section 6 allows. Do not edit files owned by other slices. Wait for my approval before writing code. Do not run git commit or git push.
```

## 4. Review the plan before approving

Approve only when all of these are true. If not, tell Codex what to change.

- [ ] Every file is either in the card's **owned paths** or its **shared files** list.
- [ ] No schema change, or a clear reason for one (then tell the lead before approving).
- [ ] Every admin page and admin action starts with `requireOwner()`.
- [ ] Every mutation is a server action in `src/actions/` with a Zod schema from `src/lib/validators/`.
- [ ] No prices anywhere.
- [ ] All visible text uses `t()` with keys in the card's namespace.
- [ ] Public forms use Turnstile.
- [ ] Each "Done when" item has a test or a manual check.
- [ ] New dependencies are justified and small.

For anything touching customer data, uploads or login, ask the lead to review the plan as well.

## 5. Build and test

1. Let Codex build. Ask it to work in small steps and run `pnpm lint && pnpm typecheck && pnpm test` after each step.
2. Run the site yourself (`pnpm dev`) and click through every item in the card's **Done when** list, on desktop and on a phone-width window.
3. If you changed anything in `e2e/`, run `pnpm e2e` (first time: `pnpm exec playwright install chromium`).
4. `pnpm format` before you commit.

## 6. Shared files: rules that prevent merge conflicts

Most conflicts come from a few files every slice touches. Follow these exactly:

| Shared file | Rule |
| --- | --- |
| `src/lib/i18n/en.json` and `bn.json` | Only **add** keys, prefixed with your slice's namespace (for example `booking.form.title`). Insert each key in **alphabetical position by full key**, not at the end. Never rename or delete existing keys. Bengali text may be left out; it falls back to English. To re-sort both files after resolving a conflict, run the sort command below |
| `e2e/helpers.ts`, `src/test/` | Shared test helpers. Add new helpers; don't change existing ones without asking the lead |
| `src/components/admin/admin-nav.tsx` | Add **one** link line for your section in the `links` list. Nothing else |
| `src/db/schema.ts` and `drizzle/` | Don't change unless the card says so. If you must: rebase on `main` first, then `pnpm db:generate`. Only one open PR may contain a migration at a time; say "Contains migration" in the PR title. If `main` gets a new migration while your PR is open, delete your migration files, rebase, regenerate. Never hand-edit `drizzle/meta/` |
| `package.json`, `pnpm-lock.yaml` | Add dependencies with `pnpm add`. On a lockfile conflict: take `main`'s `pnpm-lock.yaml`, run `pnpm install`, commit the result |
| `docs/DECISIONS.md` | Append one dated line at the end for any non-obvious choice. On conflict, keep both lines |
| `.env.example` | Append new variable names (no values) with a comment |
| `src/components/ui/*` | Add components only with the shadcn CLI (`pnpm dlx shadcn@latest add <name>`). If two branches add the same component, keep either copy |
| `src/app/globals.css` | Owned by slices #9 and #13 only. Others don't touch it |

**Sort the i18n files** (keeps keys alphabetical so parallel branches rarely clash):
```
node -e 'const fs=require("fs");for(const f of ["en","bn"]){const p=`src/lib/i18n/${f}.json`;const d=JSON.parse(fs.readFileSync(p,"utf8"));const s=Object.fromEntries(Object.keys(d).sort().map(k=>[k,d[k]]));fs.writeFileSync(p,JSON.stringify(s,null,2)+"\n")}'
```
**Resolving a conflict in `en.json` / `bn.json`:** keep both sides' keys, delete the conflict markers, fix the commas, run the sort command, then `pnpm typecheck`.

## 7. Stay up to date while you work

At least once a day, and always before opening the PR:
```
git fetch origin
git rebase origin/main
```
Fix any conflicts using the table above, then rerun `pnpm install && pnpm lint && pnpm typecheck && pnpm test`. If a conflict touches files outside your slice and you're not sure, stop and ask the lead.

## 8. Commit and push

Codex lists the commands at the end; check them before running. Your commit:
- adds only your slice's files (never `.env.local`)
- uses a message like `feat: product management dashboard (OD-10..OD-17) (#2)`
- contains **no** `Co-Authored-By` lines, "Generated with" footers or AI tool names

```
git status
git add <files>
git commit -m "feat: <summary> (<requirement IDs>) (#<issue>)"
git push -u origin feat/<issue>-<short-name>
```

## 9. Open the pull request

1. Open the link Git prints, or GitHub → Pull requests → New.
2. Title: `#<issue> <slice name>`. The template fills the description: complete every section and tick the checklist.
3. Add `Closes #<issue>` to the description.
4. Ask for a review from someone who didn't build it (the lead by default).
5. CI must be green (lint, typecheck, tests, format).

## 10. Review and merge

- **Reviewer:** run the branch locally, walk through the card's "Done when" list, check the PR checklist, and leave comments. Approve when everything passes.
- **Merge:** **Squash and merge** only. Delete the branch after merging.
- **After merging:** tell the lead in one message: what was built, anything changed from the plan, anything left over, and any new environment variable or migration. The lead updates the tracker and applies migrations to the shared project.

## 11. When you're blocked

Stop and message the lead if:
- a dependency slice isn't merged yet
- you need to change another slice's files or the schema
- the SRS or card is unclear, or the client needs to answer something
- tests fail on `main` itself

Don't work around it silently. A quick question saves a painful merge.
