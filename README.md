# Shudha's Studio

Website and owner dashboard for Shudha's Studio, a Melbourne personalised-gift maker.

- Requirements: [`docs/SRS.md`](docs/SRS.md)
- Coding rules and stack (read before working, Claude Code reads it automatically): [`CLAUDE.md`](CLAUDE.md)
- Decisions log: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Work is tracked in GitHub Issues #1–#16, in build order.

## Local setup
1. Install Node 24 (`.nvmrc`) and pnpm 12.
2. Copy `.env.example` to `.env.local` and fill in the keys (ask Sayek for the shared vault). Never commit `.env.local`.
3. `pnpm install`
4. `pnpm db:migrate` then `pnpm db:seed` (first time only; both are safe to re-run)
5. `pnpm dev` and open http://localhost:3000. The dashboard is at `/admin`; sign in with the owner account (`OWNER_EMAIL`).

## Everyday commands
```
pnpm dev                                   # local dev server
pnpm lint && pnpm typecheck && pnpm test   # must pass before a PR
pnpm format                                # prettier
pnpm db:generate                           # new migration after editing src/db/schema.ts
pnpm db:migrate                            # apply migrations
pnpm db:studio                             # browse data
pnpm e2e                                   # playwright; run `pnpm exec playwright install chromium` once
```

## Deployment
Netlify builds `main` to production and every pull request to a preview URL (`netlify.toml`). Environment variables are set in the Netlify UI. CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and the format check on every push and PR.
