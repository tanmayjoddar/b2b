# 00 — AI Index & Working Agreement

> Read this file FIRST in every session. It tells you which doc to read, what rules always apply, and how to work.

## Project in one line
A verified manufacturing matchmaker for Indian D2C brands. A brand submits a brief ("10k protein chips"), we return 3-5 **verified** factories with MOQ, certifications, capacity and quotes, then help with samples, payment protection and QC. Working name: **FactoryMatch** (rename freely).

## Doc map

| Doc | Read when you are... |
|---|---|
| `01_PRODUCT.md` | Unsure WHAT to build or WHY. Scope, users, flows, USP, non-goals. |
| `02_ARCHITECTURE.md` | Designing modules, data model, state machines, permissions, API contracts. |
| `03_BACKEND.md` | Writing any server code (NestJS, Prisma, queues, WhatsApp, payments). |
| `04_FRONTEND.md` | Writing any UI code (Next.js, forms, API client, i18n). |
| `05_SECURITY.md` | Writing ANY code. Mandatory. Security rules override everything else. |
| `06_DEVOPS_AND_QUALITY.md` | Touching infra, Docker, CI, migrations, backups, testing, monitoring. |

## Precedence when docs conflict
1. `05_SECURITY.md` always wins.
2. `02_ARCHITECTURE.md` (data model, state machines, permissions) wins over layer docs.
3. `03_BACKEND.md` / `04_FRONTEND.md` win over personal preference.
4. If still unclear: **ask the human**, do not guess.

## Hard rules for the AI (non-negotiable)
1. **TypeScript strict mode**, no `any` without a comment explaining why.
2. **Validate every input** at the boundary with Zod. Never trust the client.
3. **Never hardcode secrets.** Env vars only, validated at startup.
4. **Authorization on every endpoint** (guard + ownership check). Authentication alone is not enough.
5. **Money is integer paise.** Never floats.
6. **Never skip tests** for services containing business logic or state transitions.
7. **Ask before adding a dependency.** State why, size, maintenance status, alternatives.
8. **Small, reviewable changes.** One slice at a time. No sweeping refactors unprompted.
9. **No fake data in production paths**, no TODO-stubs that pretend to work. Mark unfinished code clearly and tell the human.
10. **Do not invent product behavior.** If a rule is missing from the docs, ask.

## How to work (every task)
1. Restate the task in 2-3 lines and name which docs apply.
2. List files you will create/change **before** writing code.
3. Implement following the layering in `03_BACKEND.md` / `04_FRONTEND.md`.
4. Write/update tests.
5. Run: lint, typecheck, tests. Fix failures.
6. Summarize: what changed, what was not done, any risks, any decisions the human must make.

## Repo layout (pnpm monorepo)
```
factorymatch/
  apps/
    api/            # NestJS backend
    web/            # Next.js frontend
  packages/
    shared/         # Zod schemas, DTO types, enums, constants (single source of truth)
    config/         # eslint, tsconfig, prettier shared configs
  docs/             # these md files
  infra/            # docker-compose, Caddyfile, backup scripts, runbooks
  .github/workflows/
```

## Build order (slices) and definition of done

Each slice is shippable on its own. Do not start the next until the current one is Done.

| # | Slice | Done when |
|---|---|---|
| 0 | Repo, CI, lint, typecheck, Docker, env validation, health endpoint | CI green, `/health` deployed on Oracle VM |
| 1 | Auth + roles (brand, factory, admin), sessions, RBAC guards | Role tests pass; cross-tenant access tests fail correctly |
| 2 | Factory onboarding + document upload + admin verification panel | Admin can verify a factory and set its tier |
| 3 | Brand brief form + admin manual matching → shortlist page | A brief becomes a shortlist visible to the brand only |
| 4 | Quote request/response (WhatsApp notify via queue) | Factory quotes, brand compares, retries work |
| 5 | Orders + state machine + sample tracking | Illegal transitions rejected; events logged |
| 6 | Payments (Razorpay) + webhooks + idempotency | Duplicate webhook does not double-apply |
| 7 | Reviews + inspections + audit log views | Reviews only after completed order |
| 8 | Hardening: rate limits, backups restore drill, monitoring, DPDP checks | Restore drill passed; security checklist 100% |

Definition of done for ANY slice: tests written, lint + typecheck clean, security checklist items for that slice ticked, docs updated if behavior changed, migration is reversible or documented.

## Glossary
- **Brief**: a brand's structured manufacturing request.
- **Shortlist**: the 3-5 verified factories matched to a brief.
- **Tier**: verification level of a factory (Documents, Video, Order Proven, Inspected).
- **Quote**: a factory's priced offer against a brief.
- **MOQ**: minimum order quantity.
