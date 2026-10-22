# 05 — Security Rules for Writing Code (MANDATORY)

This doc overrides every other doc. If a task conflicts with it, stop and tell the human. Treat every checklist item as required unless the human explicitly waives it.

## 0. Mindset
- **Never trust input** (body, query, params, headers, cookies, files, webhooks, JWT claims, other services, even the frontend).
- **Deny by default.** Access must be explicitly granted.
- **Least privilege** everywhere: users, DB roles, API keys, VM firewall.
- **Defense in depth:** validation + authorization + DB constraints + rate limits + monitoring.
- **Fail closed and fail quietly:** safe generic error to the client, full detail in server logs.
- Threats specific to this product: a brand reading another brand's brief, a factory seeing competitor quotes, a fake factory with forged certificates, a spoofed payment webhook, an unauthorized admin action, a poisoned upload.

## 1. Authentication
- [ ] Passwords hashed with **argon2id** (sane memory/time cost). Never bcrypt-with-low-cost, never MD5/SHA.
- [ ] Minimum password rules + breached-password check where feasible. No password in logs.
- [ ] Factory login by **phone OTP**: 6 digits, ≤ 5 min expiry, single use, max attempts, per-phone and per-IP rate limits, constant-time compare.
- [ ] Access token short-lived (~15 min). **Refresh token rotation with reuse detection**; store only hashes of refresh tokens.
- [ ] Cookies: `HttpOnly; Secure; SameSite=Lax` (or Strict for admin). No tokens in `localStorage`.
- [ ] Generic login errors (no "user not found" vs "wrong password"). Lockout/backoff after repeated failures.
- [ ] Admin: mandatory TOTP 2FA, short session, IP/rate limits, every action audit-logged.
- [ ] Logout and password change revoke sessions.

## 2. Authorization (most common source of real bugs)
- [ ] Every endpoint has an explicit guard: authenticated + role + **ownership/tenant check**.
- [ ] Ownership enforced in service/repository (e.g. `WHERE brand_id = :userBrandId`), not only in the controller or UI.
- [ ] Return **404** (not 403) for resources the user must not know exist.
- [ ] No IDOR: never fetch by ID alone for tenant data.
- [ ] Mass-assignment protection: DTOs whitelist fields; never spread request bodies into DB writes. Role, status, tier, verified flags, prices and amounts are **never** client-settable.
- [ ] Factories never see competitor quotes or other brands' briefs.
- [ ] Privileged actions (verify factory, change tier, refund, edit order status) are admin-only and audit-logged with before/after.
- [ ] Write negative tests for every policy.

## 3. Input validation and injection
- [ ] **Zod validation on every request** at the edge; `whitelist` unknown fields (strip or reject).
- [ ] Limit sizes: body size, string length, array length, page size, nesting.
- [ ] Use Prisma/parameterized queries only. **No string-concatenated SQL.** If raw SQL is required use tagged/parameterized form and flag for review.
- [ ] Never build shell commands from user input. No `eval`, `new Function`, dynamic `require`.
- [ ] Validate URLs from users; block SSRF (no fetching arbitrary URLs; if needed, allowlist hosts and block private IP ranges and metadata endpoints).
- [ ] Sanitize/encode output. React escapes by default; never `dangerouslySetInnerHTML` with user data.
- [ ] Safe file/path handling: never use user input in file paths; generate storage keys server-side.
- [ ] Beware ReDoS: avoid catastrophic regexes on user input.

## 4. Web security (CSRF, XSS, CORS, headers)
- [ ] CORS: explicit allowlist of the exact frontend origin(s); no `*` with credentials.
- [ ] CSRF: SameSite cookies + CSRF token (or double-submit) for cookie-authenticated state-changing requests; check `Origin`/`Host`.
- [ ] Security headers: `Content-Security-Policy` (strict, no `unsafe-inline` where possible), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame protection (`frame-ancestors 'none'`). Use `helmet` on the API.
- [ ] HTTPS everywhere; HSTS; redirect HTTP → HTTPS.
- [ ] No sensitive data in URLs or query strings.
- [ ] Disable verbose errors, source maps with secrets, and debug endpoints in production.

## 5. Rate limiting and abuse
- [ ] Global rate limit + stricter limits on login, OTP send/verify, password reset, file upload, webhook, search.
- [ ] Per-IP and per-account limits; exponential backoff on failures.
- [ ] Cloudflare WAF/bot protection in front; Turnstile (free) on public forms (signup, brief, contact).
- [ ] Request timeouts and max payload sizes; protect against slowloris-style hangs.
- [ ] OTP/WhatsApp send cost abuse: cap sends per phone/day.

## 6. File uploads (certificates, documents, reports)
- [ ] Allowlist mime **and** verify magic bytes; allowlist extensions (pdf, jpg, png, webp); size limits.
- [ ] Never trust client filename; generate random storage keys; store original name as metadata only.
- [ ] Store in **private** bucket; access only via **short-lived presigned URLs** after an authorization check.
- [ ] Malware scan (ClamAV on the VM, async) before marking a file usable; quarantine on failure.
- [ ] Strip EXIF/metadata from images where relevant. Never execute or render uploaded content inline from the app origin (serve from separate domain/bucket, `Content-Disposition: attachment` for documents).
- [ ] Store `sha256`, size, mime, scan status, uploader.

## 7. Secrets and configuration
- [ ] **No secrets in git, ever.** `.env` in `.gitignore`; commit only `.env.example` with fake values.
- [ ] Validate all env vars at startup with Zod; crash if missing/invalid.
- [ ] Separate secrets per environment; rotate on suspicion; least-privilege API keys (e.g. R2 token scoped to one bucket).
- [ ] Use a secret scanner in CI (gitleaks) and pre-commit.
- [ ] Never log secrets, tokens, OTPs, full phone numbers, document numbers, or request bodies containing them (pino `redact`).
- [ ] Production DB credentials different from dev; app DB user has only needed privileges (no superuser, no DDL in runtime user).

## 8. Payments and webhooks (Razorpay, WhatsApp)
- [ ] **Amounts come from the database**, never from the client.
- [ ] Verify Razorpay payment signature server-side. Verify **webhook signature using the raw body**; reject if invalid.
- [ ] Idempotency: dedupe webhook events by event id; unique constraints on `(order_id, milestone)` and `idempotency_key`.
- [ ] Process webhooks via queue; respond 2xx quickly; log and alert on repeated failures.
- [ ] Reconcile payments daily against the provider. Never mark paid based on a client redirect.
- [ ] Do not store card data. Ever. (PCI scope stays with Razorpay.)
- [ ] WhatsApp webhook: verify token/signature, validate payload shape, ignore unknown senders for sensitive actions.

## 9. Data protection and privacy (DPDP Act, India)
- [ ] Collect only what is needed; document purpose for each personal field.
- [ ] Clear consent at signup (terms + privacy policy); record consent version and timestamp.
- [ ] Provide data access/correction/deletion paths; soft-delete then purge on schedule; keep legally required records.
- [ ] Encrypt in transit (TLS) and at rest (disk encryption on VMs; encrypted backups). Field-level encryption for especially sensitive values (e.g. tax/ID numbers) where justified.
- [ ] Mask PII in logs and admin lists by default (e.g. `98******21`).
- [ ] Breach response plan: who to notify, how fast, what to log (see runbook in devops doc).
- [ ] Data minimization in API responses: DTO mappers return only needed fields; never return internal fields (hashes, internal notes, other users' emails).

## 10. Audit logging
- [ ] Append-only `AuditLog` for: logins/failed logins (admin), verification actions, tier changes, quote acceptance, order status changes, payments, role changes, data exports, deletions.
- [ ] Each entry: actor, action, entity, before/after (redacted), IP, user agent, timestamp, requestId.
- [ ] App DB user cannot update/delete audit rows.

## 11. Dependencies and supply chain
- [ ] Ask the human before adding any dependency. Prefer well-maintained, widely used packages; check last release, downloads, license.
- [ ] Lockfile committed; install with frozen lockfile in CI.
- [ ] `pnpm audit`/OSV scanning and Dependabot/Renovate on a schedule; fix high/critical promptly.
- [ ] Avoid postinstall-script packages unless reviewed. Pin Docker base image versions (not `latest`); scan images (Trivy).
- [ ] No copying unknown snippets/crypto from the internet. Use vetted libraries for crypto; never roll your own.

## 12. Infrastructure security (Oracle VMs, Cloudflare)
- [ ] Postgres VM accepts connections **only from the API VM's private IP**. No public DB port.
- [ ] API not exposed directly: traffic via **Cloudflare Tunnel** (or Caddy + Cloudflare-only IP allowlist). Close all other inbound ports.
- [ ] Oracle security lists/NSG **and** host firewall (iptables/ufw: Oracle Ubuntu images ship restrictive iptables rules, so check them).
- [ ] SSH: key-only, no root login, non-default port optional, fail2ban, or SSH only via Cloudflare Access/Tailscale.
- [ ] Automatic security updates (`unattended-upgrades`); regular reboots.
- [ ] Docker: non-root user in containers, read-only FS where possible, no `--privileged`, no secrets baked in images, resource limits.
- [ ] Backups encrypted, stored **off-VM** (R2), restore tested regularly.
- [ ] Cloudflare: Full (strict) TLS, WAF managed rules, bot fight mode, rate-limiting rules, Turnstile, Access protecting `/admin` if possible.

## 13. Logging and monitoring for security
- [ ] Structured logs with `requestId`; ship to a place off the VM if possible.
- [ ] Alert on: spike in 401/403, repeated OTP failures, webhook signature failures, admin logins from new IPs, queue dead-letter growth, unusual download volume.
- [ ] Uptime checks and error tracking (Sentry/GlitchTip) without sending PII.

## 14. Secure coding patterns (examples)

**Validated, authorized, mass-assignment-safe create**
```ts
// shared schema: only allowed fields exist
export const CreateBriefSchema = z.object({
  verticalId: z.string().uuid(),
  productName: z.string().min(2).max(120),
  quantityUnits: z.number().int().positive().max(10_000_000),
  targetPriceMinPaise: z.number().int().nonnegative().optional(),
  // NOTE: no brandId, status, or tier: server sets these
}).strict();

async create(user: AuthUser, dto: CreateBriefDto) {
  const brand = await this.brands.requireForUser(user.id); // ownership from session, not request
  return this.repo.create({ ...dto, brandId: brand.id, status: BriefStatus.DRAFT });
}
```

**Webhook verification (raw body)**
```ts
const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
  throw new UnauthorizedError('BAD_SIGNATURE');
}
// then: dedupe by event id, enqueue, return 200
```

**Safe error to client, detail to logs**
```ts
catch (e) {
  this.logger.error({ err: e, requestId }, 'quote.submit failed');
  throw new AppError('INTERNAL_ERROR', 500, 'Something went wrong'); // no stack, no SQL
}
```

## 15. Pre-merge security checklist (copy into every PR)
- [ ] All inputs validated with strict Zod schemas
- [ ] AuthN + role + ownership check on every new endpoint, with negative tests
- [ ] No client-settable privileged fields (role, status, tier, amount, ownerId)
- [ ] No secrets, tokens, PII in code, logs, or error messages
- [ ] Rate limits on any new public/sensitive endpoint
- [ ] Uploads: type/size/magic-byte checks, private storage, scan
- [ ] Webhooks: signature verified, deduped, idempotent
- [ ] Migrations safe; DB constraints back up app rules
- [ ] Audit log added for sensitive actions
- [ ] New dependencies approved; audit is clean
- [ ] Responses return minimal fields via DTO mappers

## 16. What the AI must do when unsure
Stop, state the risk in one or two lines, propose the safest option, and ask the human. Never ship a "temporary" insecure shortcut. Never disable a security control to make a test pass.
