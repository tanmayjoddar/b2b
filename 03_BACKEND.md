# 03 — Backend Guide (NestJS + Prisma + Postgres + pg-boss)

Read `05_SECURITY.md` and `02_ARCHITECTURE.md` first. This doc says HOW to write backend code.

## 1. Stack
| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Framework | NestJS (modular), Express adapter (Fastify optional later) |
| ORM | Prisma (migrations via `prisma migrate`) |
| DB | PostgreSQL 16 |
| Validation | Zod via `nestjs-zod`, schemas live in `packages/shared` |
| Queue | pg-boss (upgrade path: BullMQ) |
| Auth | Sessions or short-lived JWT access + rotating refresh; argon2id hashing |
| Config | `@nestjs/config` + Zod-validated env schema |
| Logging | pino (`nestjs-pino`), JSON, redact sensitive fields |
| Docs | `@nestjs/swagger` → OpenAPI |
| Testing | Vitest/Jest + Supertest + Testcontainers (real Postgres) |

## 2. Folder structure (per module)
```
apps/api/src/
  main.ts
  app.module.ts
  common/            # guards, interceptors, filters, decorators, pipes, errors, utils
  config/            # env schema, config module
  infra/             # prisma service, queue, storage (R2), whatsapp client, razorpay client
  modules/
    briefs/
      briefs.module.ts
      briefs.controller.ts      # HTTP only: parse, authorize, call service, map response
      briefs.service.ts         # business logic and use cases
      briefs.repository.ts      # ALL Prisma access for this module
      briefs.policy.ts          # authorization/ownership rules
      briefs.events.ts          # domain events emitted
      dto/                      # re-export zod schemas from packages/shared
      briefs.service.spec.ts
      briefs.e2e-spec.ts
```

## 3. Layering rules (strict)
```
Controller → Service → Repository → Prisma
                 ↘ Policy (authorization)
                 ↘ other modules via their exported Service only
```
- **Controller:** no business logic, no Prisma. Validates input (pipe), applies guards, calls one service method, returns DTO.
- **Service:** business rules, orchestration, transactions, emits events. No HTTP types (`Request`, `Response`).
- **Repository:** only place that talks to Prisma. Returns domain objects or typed DTOs. Always accept `tenant/ownership` constraints where relevant.
- **Policy:** pure functions: `canViewBrief(user, brief)`. Unit-test heavily.
- Never import another module's repository. Use its service or listen to its events.

## 4. Reusable code rules
1. **Single source of truth for shapes:** Zod schemas in `packages/shared`; infer TS types (`z.infer`). Backend and frontend import the same schema.
2. **DRY, but don't over-abstract.** Extract after the **third** repetition, not the first. Prefer small composable functions over deep inheritance.
3. **Generic helpers worth having:** `paginate()`, `AppError` hierarchy, `withTransaction()`, `assertOwnership()`, `idempotent()`, `retry()`, `money` utils (paise ↔ display).
4. **Base patterns:** a thin `BaseRepository` for soft-delete/pagination is fine; no giant generic CRUD factories that hide logic.
5. **No magic strings/numbers:** enums and constants in `packages/shared` or `common/constants`.
6. **Naming:** files `kebab-case`, classes `PascalCase`, functions verbs (`createBrief`, `submitQuote`), booleans `isX/hasX/canX`, DB columns `snake_case`, TS fields `camelCase`.
7. **Functions:** small, one purpose, ≤ ~40 lines; early returns; no deep nesting; pure where possible.
8. **Errors:** throw typed `AppError(code, httpStatus, message)`; a global exception filter formats the response. Never leak stack traces or SQL errors to clients.
9. **Comments:** explain WHY, not WHAT. Public service methods get a one-line doc comment.
10. **Dates:** store UTC (`timestamptz`), format at the edge. Use one date library consistently (date-fns).

## 5. Controller template
```ts
@Controller('api/v1/briefs')
@UseGuards(AuthGuard, RolesGuard)
export class BriefsController {
  constructor(private readonly briefs: BriefsService) {}

  @Post()
  @Roles(Role.BRAND)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBriefDto) {
    const brief = await this.briefs.create(user, dto);
    return { data: toBriefResponse(brief) };
  }

  @Get(':id')
  @Roles(Role.BRAND, Role.ADMIN)
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return { data: toBriefResponse(await this.briefs.getForUser(user, id)) };
  }
}
```

## 6. Service/policy template
```ts
async getForUser(user: AuthUser, id: string) {
  const brief = await this.repo.findById(id);
  if (!brief) throw new NotFoundError('BRIEF_NOT_FOUND');
  if (!briefPolicy.canView(user, brief)) throw new NotFoundError('BRIEF_NOT_FOUND'); // 404, not 403, avoids leaking existence
  return brief;
}
```

## 7. Database rules
- Every schema change = Prisma migration committed to git. Never edit a deployed migration; add a new one.
- **Expand/contract** for breaking changes (add new column → backfill → switch code → remove old).
- Use **transactions** for multi-write use cases (e.g., state transition + event + audit).
- Avoid N+1: use `include`/`select` deliberately; select only needed fields.
- Add indexes with the query that needs them; check with `EXPLAIN` for list endpoints.
- Soft delete via `deleted_at`; repositories filter it by default.
- Use DB constraints (unique, FK, check) as the last line of defense, not just app logic.
- Use `SELECT ... FOR UPDATE` (or optimistic `version` column) on rows with concurrent state changes (orders, payments).
- Connection pooling: Prisma pool sized to VM; consider PgBouncer later.

## 8. State transitions
All status changes go through a transition function (see `02_ARCHITECTURE.md`):
```ts
const ALLOWED: Record<OrderStatus, OrderStatus[]> = { /* explicit map */ };
async transition(orderId, to, actor, reason) {
  return this.db.$transaction(async (tx) => {
    const order = await this.repo.lockById(tx, orderId);
    if (!ALLOWED[order.status].includes(to)) throw new ConflictError('ILLEGAL_TRANSITION');
    if (!orderPolicy.canTransition(actor, order, to)) throw new ForbiddenError();
    await this.repo.updateStatus(tx, orderId, to);
    await this.events.append(tx, { orderId, from: order.status, to, actor, reason });
    await this.audit.log(tx, { /* ... */ });
    return order;
  });
}
```
Test every legal and several illegal transitions.

## 9. Queues and background jobs (pg-boss)
- Define job names and payload Zod schemas in one place. Payload = IDs and minimal data.
- Handlers must be **idempotent** (safe to run twice). Use a `dedupe key` such as `notification:{id}`.
- Retries: exponential backoff, max attempts, then dead-letter + alert.
- Never call WhatsApp/Razorpay/email inside an HTTP request handler. Enqueue instead.
- Scheduled jobs (cron via pg-boss schedule): quote expiry, verification expiry reminder, no-reply nudges.
- Graceful shutdown: stop fetching new jobs, finish in-flight work.

## 10. External integrations
Wrap each in a client class in `infra/` with a small interface so it can be mocked and swapped.
- **WhatsApp:** template messages only for business-initiated; store message ids; handle delivery webhooks; respect opt-in; start with click-to-chat links, move to Cloud API when paying customers exist.
- **Razorpay:** create order server-side; verify payment signature server-side; **verify webhook signature** with raw body; dedupe by event id; amounts come from the DB, never from the client; reconcile with a daily job.
- **R2/S3:** private bucket, presigned upload/download URLs with short expiry, validate mime/size, scan, store sha256.
- All outbound calls: timeouts, retries with backoff, circuit-breaking for repeated failures, no secrets in logs.

## 11. Auth implementation notes
- Hash with **argon2id**. Never log or return hashes.
- Brands/admin: email + password (+ optional TOTP for admin). Factories: **phone OTP** (via WhatsApp/SMS) with attempt limits and expiry.
- Access token ~15 min; refresh token rotation with reuse detection; store refresh token hashes; httpOnly + Secure + SameSite cookies.
- Account lockout/backoff on repeated failures; generic error messages (no user enumeration).
- Admin routes require admin role AND are rate limited AND log every action.

## 12. API conventions (summary; details in architecture doc)
`/api/v1`, `{ data }` / `{ error: { code, message, requestId } }`, cursor pagination, `Idempotency-Key` for POST payments/orders, ISO 8601 UTC dates, money as integer paise with `currency: "INR"`.

## 13. Testing (backend)
- **Unit:** services with mocked repos, policies, state machine, money utils.
- **Integration/e2e:** real Postgres via Testcontainers; test full request → DB.
- **Security tests:** cross-tenant access denied, role escalation denied, invalid input rejected, webhook with bad signature rejected, duplicate webhook is idempotent.
- Coverage target: services/policies/state machines ≥ 85%; don't chase 100% on glue code.
- Tests must be deterministic: fake clock, no network.

## 14. Performance basics
- Paginate every list. Cap page size.
- Compress responses, ETag where useful.
- Cache only stable, public read data (factory public profiles) with short TTL; never cache authorized data without keying by user.
- Measure before optimizing; add indexes from real slow queries.

## 15. Definition of done (backend PR)
- [ ] Zod schema in `packages/shared`, DTO inferred
- [ ] Controller thin, service holds logic, repository holds Prisma
- [ ] Guards + policy + ownership check present
- [ ] Migration included and reviewed
- [ ] Unit + e2e tests incl. negative/security cases
- [ ] Errors use `AppError`; no leaked internals
- [ ] Audit log entries for sensitive actions
- [ ] OpenAPI updated; lint, typecheck, tests green
