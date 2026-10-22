# 02 — Architecture & System Design

## 1. Principles
1. **Modular monolith.** One deployable backend, strict module boundaries. Split into services only when a measured need appears.
2. **Boring tech, strong boundaries.** Postgres + a Postgres-backed queue before anything exotic.
3. **Design for change, not scale.** Year-1 load is small (about 10k requests/day). Optimize for clarity and safe modification.
4. **Data model first.** Entities and state machines are 70% of the design.
5. **Everything important is auditable and idempotent.**
6. **Config over code for verticals.** Category attributes, required docs, and certifications are data.

## 2. System context
```
Brand/Admin browser ──► Cloudflare (DNS, WAF, Pages/Workers: Next.js web)
                                   │  HTTPS (via Cloudflare Tunnel)
                                   ▼
                      Oracle VM #1: NestJS API + pg-boss workers
                                   │  private network only
                                   ▼
                      Oracle VM #2: PostgreSQL (backups ► Cloudflare R2)

Factory ◄──► WhatsApp (Meta Cloud API / click-to-chat) ◄──► API webhooks
Razorpay ◄──► API (payments, signed webhooks)
Cloudflare R2: private file storage (signed URLs)
```

## 3. Backend modules and boundaries
| Module | Owns | Must not |
|---|---|---|
| `auth` | users, sessions, OTP, roles | know about briefs/orders |
| `brands` | brand profiles | touch factory data |
| `factories` | profiles, capabilities, certificates, verification | expose private docs publicly |
| `verification` | checks, tiers, evidence, expiry | be bypassed by other modules |
| `briefs` | briefs, requirements | do matching logic itself |
| `matching` | shortlists (manual now, rules/AI later) | write to orders |
| `quotes` | quote requests, quotes, comparison | change order state |
| `samples` | sample lifecycle | handle payments |
| `orders` | order state machine, events | call Razorpay directly |
| `payments` | Razorpay, webhooks, ledger | contain order business rules |
| `reviews` | reviews, ratings | allow review without completed order |
| `inspections` | inspection requests/results | |
| `notifications` | WhatsApp/email/in-app via queue | block request handlers |
| `uploads` | file records, signed URLs, scanning | serve files publicly |
| `audit` | append-only audit log | be editable |
| `admin` | admin-only use cases composing other modules | hold duplicated logic |

Rule: modules talk through **exported services/interfaces and domain events**, never by importing another module's repository or Prisma models directly.

## 4. Data model (core entities)
All tables: `id` (UUIDv7 or cuid2), `created_at`, `updated_at`, optional `deleted_at` (soft delete), `created_by` where useful. Money in **integer paise**. Enums via Postgres enums or lookup tables.

```
User(id, email, phone, password_hash?, role[BRAND|FACTORY|ADMIN], status, last_login_at)
Brand(id, user_id, company_name, gst_no?, website?, ...)
Factory(id, owner_user_id, legal_name, city, state, pincode, lat?, lng?, tier, status[PENDING|ACTIVE|SUSPENDED], capacity_notes, lead_time_days_min/max)
FactoryVertical(factory_id, vertical_id)
Vertical(id, slug, name, attribute_schema_json)
FactoryCapability(id, factory_id, vertical_id, product_type, moq_units, capacity_units_per_month, packaging_options[], attributes_json)
Certificate(id, factory_id, type[FSSAI|GST|UDYAM|ISO|GMP|HACCP|OTHER], number, issuer, valid_from, valid_to, file_id, status[SUBMITTED|VERIFIED|REJECTED|EXPIRED])
Verification(id, factory_id, tier, method[PAPER|VIDEO|ORDER|INSPECTION], result, evidence_file_id?, notes, performed_by, performed_at, expires_at?)
Brief(id, brand_id, vertical_id, product_name, quantity_units, target_price_paise_per_unit_min/max, requirements_json, timeline_weeks, status)
Shortlist(id, brief_id, created_by_admin_id, status)
ShortlistItem(id, shortlist_id, factory_id, rank, admin_note)
QuoteRequest(id, brief_id, factory_id, status, expires_at)
Quote(id, quote_request_id, price_paise_per_unit, moq_units, lead_time_days, valid_until, terms_json, status[SUBMITTED|ACCEPTED|REJECTED|EXPIRED|WITHDRAWN])
Sample(id, brief_id, factory_id, status, tracking_ref?, brand_feedback?)
Order(id, brand_id, factory_id, quote_id, status, total_paise, quantity_units)
OrderEvent(id, order_id, from_status, to_status, actor_user_id, reason, at)   // append-only
Payment(id, order_id, milestone, amount_paise, status, razorpay_order_id, razorpay_payment_id?, idempotency_key)
Inspection(id, order_id|factory_id, agency, status, report_file_id?, fee_paise)
Review(id, order_id, brand_id, factory_id, on_time, quality_vs_sample, communication, comment)
Notification(id, user_id, channel, template, payload_json, status, attempts, last_error?)
FileObject(id, owner_user_id, bucket_key, mime, size, sha256, scan_status, purpose)
AuditLog(id, actor_user_id, action, entity_type, entity_id, before_json?, after_json?, ip, user_agent, at)  // append-only
```

Indexes: foreign keys, `(factory_id, status)`, `(brand_id, status)`, `(brief_id)`, unique `(order_id, milestone)` on Payment, unique `idempotency_key`. Add GIN/full-text index for factory search later.

## 5. State machines (enforced in code, tested)

### Brief
`DRAFT → SUBMITTED → MATCHING → SHORTLISTED → QUOTING → CLOSED` (or `CANCELLED` from any non-terminal state).

### QuoteRequest / Quote
`REQUESTED → SUBMITTED → ACCEPTED | REJECTED | EXPIRED | WITHDRAWN`. Only one ACCEPTED quote per brief per order.

### Sample
`REQUESTED → DISPATCHED → RECEIVED → APPROVED | REJECTED`.

### Order
`CONFIRMED → SAMPLE_APPROVED → ADVANCE_PAID → IN_PRODUCTION → READY → INSPECTED(optional) → SHIPPED → DELIVERED → COMPLETED`; `CANCELLED` / `DISPUTED` allowed from defined states only.

Implementation rule: a single `transition(order, toStatus, actor, reason)` function validates against an explicit allowed-transitions map, checks actor permission, writes `OrderEvent` and `AuditLog` in the same DB transaction, then emits a domain event. No other code may set `order.status`.

## 6. Permissions model (RBAC + ownership)
| Resource | Brand | Factory | Admin |
|---|---|---|---|
| Own profile | RW | RW | RW |
| Factory public profile (tier, capabilities, reviews) | R | R (own: RW) | RW |
| Factory private docs | none | own only | R |
| Brief | own only (RW) | only if shortlisted/quote requested: R limited fields | R |
| Other brands' briefs | none | none | R |
| Quote | R for own briefs | RW own quotes only | R |
| **Competitor quotes** | none (except on own brief, shown compared) | **never** | R |
| Orders | own | own | RW |
| Payments | own R | own R | RW |
| Reviews | create (own completed orders) | R | moderate |
| Audit log | none | none | R |

Every query that returns tenant data must filter by ownership in the repository or policy layer, not only in the controller. Write negative tests ("brand A cannot read brand B's brief").

## 7. Async work and events
- Queue: **pg-boss** (Postgres-backed). Upgrade path: BullMQ + Redis/Valkey.
- Jobs: send WhatsApp/email, quote expiry, verification expiry reminders, factory no-reply reminders, nightly backup check, webhook retries.
- Rules: jobs idempotent, retry with exponential backoff, dead-letter handling, jobs store IDs not full payload copies of sensitive data.
- Domain events (in-process first): `BriefSubmitted`, `ShortlistPublished`, `QuoteSubmitted`, `OrderStatusChanged`, `PaymentCaptured`. Handlers enqueue notifications; they never call external APIs inline.
- Outbox pattern for events that must not be lost: write event row in the same transaction, a worker publishes it.

## 8. API design
- REST, versioned: `/api/v1/...`. OpenAPI generated from code. Frontend uses a typed client generated from it.
- Resource naming: plural nouns, nested only one level (`/briefs/:id/quote-requests`).
- Responses: `{ data, meta? }`; errors: `{ error: { code, message, details?, requestId } }`. Stable machine-readable `code`s.
- Pagination: cursor-based. Filtering and sorting via whitelisted query params.
- Idempotency: `Idempotency-Key` header on all payment and order-creating POSTs.
- Webhooks inbound: verify signature, store raw event, respond fast, process via queue, dedupe by event id.
- Rate limits per IP and per user; stricter on auth, OTP, upload, and webhook endpoints.

## 9. Search and matching evolution
1. **Now:** admin filters (vertical, certification, MOQ, location, capacity) in SQL + manual curation.
2. **Next:** Postgres full-text + weighted scoring rules (certs match, MOQ fit, past review score, response rate).
3. **Later:** Meilisearch/Typesense if needed; optional ML ranking trained on outcomes. Keep the `matching` module interface stable so the algorithm can change.

## 10. Observability
Structured JSON logs with `requestId`, `userId` (never PII/secrets), Prometheus-style metrics, health/readiness endpoints, error tracking (Sentry free tier or self-hosted GlitchTip), Uptime Kuma for uptime. See `06_DEVOPS_AND_QUALITY.md`.

## 11. Scaling path (only when measured)
1. Vertical scale the VM (free ARM allows more RAM/CPU).
2. Add read replica / PgBouncer.
3. Move workers to their own process/VM.
4. Introduce Redis for caching/queues if pg-boss becomes a bottleneck.
5. Extract a module into a service only if it has an independent scaling or team need.

## 12. Architecture Decision Records
Keep `docs/adr/NNNN-title.md` for each significant decision: context, options considered, decision, consequences. AI must propose an ADR before changing anything in this document.
