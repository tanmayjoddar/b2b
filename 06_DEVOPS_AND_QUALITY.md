# 06 — DevOps, Infrastructure & Quality (Completely Free Stack)

Goal: run the whole product at ~₹0/month (domain excepted), stay portable, and be safe despite free-tier limits.

## 1. Free stack summary
| Piece | Choice | Notes |
|---|---|---|
| Frontend | Cloudflare Pages/Workers | Next.js via OpenNext adapter; static export where possible |
| API + workers | Oracle Always Free VM #1 (6 GB) | Docker Compose |
| Database | Oracle Always Free VM #2 (6 GB) | PostgreSQL 16, private access only |
| Queue | pg-boss (on Postgres) | Upgrade path: BullMQ + Valkey/Redis |
| Proxy/SSL | Cloudflare Tunnel (preferred) or Caddy | No open inbound ports with Tunnel |
| Files | Cloudflare R2 (free tier) | Private bucket, presigned URLs |
| Backups | `pg_dump` + `rclone` to R2 | Encrypted, off-VM |
| Monitoring | Uptime Kuma, Grafana/Prometheus (optional), GlitchTip/Sentry free | Keep memory use low |
| Email | Resend/Brevo free tier | Transactional only |
| CI/CD | GitHub Actions free tier | |
| Not free | Domain (~₹800/yr), WhatsApp Cloud API conversations, Razorpay fees (~2%/txn) | Start WhatsApp with click-to-chat |

## 2. Oracle Always Free: known risks and rules
- **Idle reclamation:** very low CPU/network/memory for a long period can get an instance reclaimed. Keep real workloads + a lightweight health cron running.
- **Capacity/availability:** ARM (Ampere) shapes can be hard to get in some regions; accounts can occasionally be suspended. **Assume the VM can disappear.** Off-VM backups are mandatory, and every service must be rebuildable from git + backup in under a few hours.
- Keep the account in good standing: upgrade to "Pay As You Go" with no usage beyond free limits can reduce reclamation risk. Set budget alerts.
- Use multi-arch Docker images (arm64 and amd64) so the stack can move to any host.
- Single point of failure is acceptable for MVP. Do not promise high availability.

## 3. VM setup checklist
**Both VMs**
- Ubuntu LTS, create non-root sudo user, SSH keys only, disable root/password login.
- `unattended-upgrades`, `fail2ban`, time sync, swap file (2 GB) as a safety net.
- Oracle VCN: private subnet or security list rules to restrict traffic. **Also check host iptables** (Oracle images block most ports by default).
- Docker + Docker Compose plugin installed; Docker log rotation configured.

**VM #2 (Postgres)**
- Allow port 5432 **only from VM #1 private IP**.
- Tune for 6 GB: `shared_buffers=1536MB`, `effective_cache_size=4GB`, `work_mem=16MB`, `maintenance_work_mem=256MB`, `max_connections=100` (use PgBouncer if more needed). Adjust after measuring.
- Separate DB roles: `app_runtime` (CRUD only), `app_migrate` (DDL), `readonly` (reporting). Runtime role cannot modify `audit_log` rows.
- Data on a dedicated volume; enable `pg_stat_statements`.

**VM #1 (API)**
- Docker Compose services: `api`, `worker`, `cloudflared` (tunnel), optional `clamav`, `uptime-kuma`.
- Memory limits per container so one service cannot starve the box.
- ClamAV is memory-hungry (~1 GB); run it only if RAM allows, otherwise scan via a lightweight async job or a smaller scanner.

## 4. Docker Compose sketch (VM #1)
```yaml
services:
  api:
    image: ghcr.io/<org>/factorymatch-api:${TAG}
    env_file: .env
    restart: unless-stopped
    mem_limit: 1536m
    user: "node"
    read_only: true
    tmpfs: [/tmp]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
  worker:
    image: ghcr.io/<org>/factorymatch-api:${TAG}
    command: ["node", "dist/worker.js"]
    env_file: .env
    restart: unless-stopped
    mem_limit: 1024m
  cloudflared:
    image: cloudflare/cloudflared:latest   # pin a version in real use
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}
    restart: unless-stopped
```

## 5. Environments and config
- Environments: `local`, `staging` (optional, can be a second compose project on the same VM), `production`.
- Config via env vars, validated at startup. `.env.example` committed; real `.env` only on the server with `chmod 600`.
- Feature flags: simple DB/table or env flags; no third-party service needed.

## 6. CI/CD (GitHub Actions)
Pipeline on every PR:
1. Install with frozen lockfile (pnpm cache).
2. Lint, typecheck, unit tests, e2e tests (Testcontainers/Postgres service).
3. Security: `pnpm audit`, gitleaks, Trivy image scan.
4. Build Docker images (multi-arch), push to GHCR on main.

Deploy on main (or tag):
1. SSH/Tailscale or a pull-based approach (Watchtower-style or a small deploy script) to VM #1.
2. Run migrations (`prisma migrate deploy`) as a separate step **before** switching traffic.
3. `docker compose pull && docker compose up -d`, wait for health check.
4. Rollback = redeploy previous image tag. Migrations follow expand/contract so the previous version still works.
Frontend deploys automatically via Cloudflare Pages/Workers from git; preview deploys per PR.

## 7. Migrations and data safety
- Never edit applied migrations. Review SQL of every migration.
- Take a `pg_dump` snapshot before risky migrations.
- Large data backfills run as background jobs, not inside the migration transaction.

## 8. Backups and disaster recovery
- **Daily** full `pg_dump` (compressed, encrypted with `age`/GPG) to R2 via rclone; **hourly WAL/incremental** optional later (pgBackRest/wal-g).
- Retention: 7 daily, 4 weekly, 3 monthly.
- Also back up: `.env` (encrypted, stored offline by the human), Cloudflare tunnel config, Compose files (in git).
- **Restore drill every month:** restore the latest backup into a scratch DB, run smoke checks, record time taken. A backup never restored is not a backup.
- Target: RPO ≤ 24h (improve later), RTO ≤ 4h.
- Runbook `infra/runbooks/restore.md` documents exact commands.

## 9. Observability
- **Logs:** pino JSON to stdout; Docker log rotation; optionally ship to Grafana Loki or Better Stack free tier. Redact PII.
- **Metrics:** `/metrics` (Prometheus format) behind auth/internal only; track request rate/latency/errors, queue depth, job failures, DB connections.
- **Uptime:** Uptime Kuma pinging `/health` (liveness) and `/ready` (DB + queue checks) from outside the VM (e.g. a second free monitor).
- **Errors:** Sentry free tier or self-hosted GlitchTip; scrub PII.
- **Alerts:** email/Telegram on downtime, DLQ growth, failed backups, disk > 80%, 5xx spike.
- Dashboards only after you actually need them; don't burn RAM on a heavy stack.

## 10. Testing strategy
| Level | Tooling | What |
|---|---|---|
| Unit | Vitest/Jest | services, policies, state machines, utils |
| Integration | Testcontainers + Supertest | API → real Postgres, queue handlers |
| Contract | OpenAPI diff in CI | catch breaking API changes |
| E2E | Playwright | brand brief → shortlist → quote → order |
| Security | custom tests + gitleaks + audit + Trivy | cross-tenant, bad signature, rate limits |
| Load (basic) | k6 | before launch: list endpoints, auth, webhook burst |
Rules: deterministic tests, fake clock, no live external APIs; flaky tests get fixed or removed, not ignored.

## 11. Code quality gates
- ESLint (type-aware), Prettier, `tsc --noEmit` strict, import-boundary rules (e.g. `eslint-plugin-boundaries` to forbid cross-module repository imports).
- Pre-commit (husky + lint-staged): format, lint, typecheck changed files, gitleaks.
- Conventional commits; PRs small; require review checklist from `05_SECURITY.md` §15.
- Dead code and unused deps checked periodically (`knip`).

## 12. Runbooks to write (`infra/runbooks/`)
- `deploy.md`, `rollback.md`
- `restore.md` (database restore from R2)
- `vm-lost.md` (rebuild VM from scratch using git + backup)
- `incident.md` (severity levels, who to contact, post-mortem template)
- `data-breach.md` (DPDP-aware steps: contain, assess, notify, document)
- `rotate-secrets.md`
- `oracle-reclaim.md` (what to do if an instance is stopped/reclaimed)

## 13. Cost guardrails
- Set budget alerts at ₹0/₹100 on Oracle and Cloudflare billing.
- Watch R2 storage/operations, WhatsApp conversation costs, and email volume.
- Each paid dependency needs a one-line justification and an owner.

## 14. Growth path (only when metrics demand it)
1. Bigger VM (free ARM allows up to the Always Free total).
2. PgBouncer, read replica, query/index tuning.
3. Separate worker VM; BullMQ + Valkey if pg-boss saturates.
4. Move to managed Postgres/hosting (AWS/GCP) when revenue justifies; Docker + `pg_dump` makes this a few hours of work.
5. Add staging environment and blue/green deploys.

## 15. Documentation and team hygiene
- README per app with run/test/deploy commands.
- ADRs for important decisions (`docs/adr`).
- Keep `00_README_AI_INDEX.md` updated when slices complete.
- Changelog for user-visible changes; migration notes for operators.
