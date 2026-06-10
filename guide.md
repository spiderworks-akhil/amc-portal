# AMC Management CRM — Build Guide

> Based on `index.html` (Requirement Sheet v1).  
> Stack: **NestJS + Kysely + PostgreSQL** | **Next.js (App Router) + Tailwind + shadcn/ui** | **Redis + BullMQ**

---

## Phase 0 — Foundation (scaffold both apps)

### 0.1 Repo setup
- [ ] Create two repos: `amc-api` (NestJS) and `amc-web` (Next.js)

### 0.2 Database
- [ ] Docker Compose: PostgreSQL 16 + Redis 7
- [ ] `db/schema.ts` — full Kysely type definitions covering all Phase 1 entities (User, Client, Asset, Contract, ServiceProvider, Server, Domain, SSL, Monitor, Incident, Reminder, AuditLog)
- [ ] Kysely migrations for each table (timestamped in `db/migrations/`)
- [ ] Seed script: sample clients, assets, domains, SSL certs
- [ ] Run migrations + seed in dev

### 0.3 NestJS scaffolding
- [ ] `nest new` with Fastify adapter (better perf)
- [ ] Global pipes (`ValidationPipe`), filters, interceptors (`transform`, `timeout`)
- [ ] Config module (`@nestjs/config`) — typed env vars
- [ ] Database module (Kysely singleton + `pg` pool, `onModuleInit` connect)
- [ ] Logger (Pino) + structured logging

### 0.4 Next.js scaffolding
- [ ] `create-next-app` with App Router + TypeScript
- [ ] Tailwind config + shadcn/ui init (dark-first theme matching the requirement sheet palette)
- [ ] TanStack Query provider + Axios instance with interceptors
- [ ] Auth context stub (login page placeholder)
- [ ] Layout shell: sidebar nav + topbar (from the HTML spec)

### 0.5 Dev tooling
- [ ] Pre-commit hooks (lint-staged, husky)
- [ ] CI: lint → typecheck → test → build per PR
- [ ] GitHub issue/PR templates

---

## Phase 1 — MVP (NestJS modules + Next.js pages)

### 1.1 Auth module
**NestJS:**
- [ ] `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- [ ] JWT access + refresh token strategy with `@nestjs/passport`
- [ ] Role guard: `StaffGuard`, `ClientGuard` — two-role only
- [ ] TOTP 2FA for staff (`otplib`, `qrcode`)
- [ ] `GET /auth/me`, `PATCH /auth/change-password`
- [ ] Rate limiting on login (`@nestjs/throttler`)

**Next.js:**
- [ ] Login page (email/password)
- [ ] 2FA setup / verify page
- [ ] Auth middleware wrapping protected routes
- [ ] Session persistence via httpOnly refresh cookie

### 1.2 Users module
**NestJS:**
- [ ] `GET /users` (admin), `GET /users/:id`, `PATCH /users/:id`
- [ ] Notification preferences (email digest on/off, reminder channels)

### 1.3 Clients module
**NestJS:**
- [ ] Full CRUD: `POST/GET /clients`, `GET/PATCH/DELETE /clients/:id`
- [ ] Multiple contacts per client (embedded or separate table)
- [ ] Tags (array field or join table) + custom fields (JSON)
- [ ] Filter: status, tag, account manager, search query
- [ ] CSV import endpoint (multer + papaparse)

**Next.js:**
- [ ] Clients list page (filterable table + search)
- [ ] Client detail page (summary card, tabs for assets/contracts/infra)
- [ ] Create/edit client form (dynamic custom fields)
- [ ] CSV import UI (drag-drop + preview + map columns)

### 1.4 Assets module
**NestJS:**
- [ ] Full CRUD: `POST/GET /assets`, `GET/PATCH/DELETE /assets/:id`
- [ ] Belongs to one client, re-assignable (audit trail)
- [ ] Type enum + admin-definable custom types (separate `AssetType` entity)
- [ ] Tags + custom fields (JSON)
- [ ] Linked to primary domain, server, contract

**Next.js:**
- [ ] Assets list (groupable/filterable by type, client, status, expiry)
- [ ] Asset detail page with tabs: domains, SSL, monitoring, contracts, infra
- [ ] Create/edit asset form with type-dependent fields
- [ ] Bulk actions (archive, reassign, export CSV)

### 1.5 Contracts (AMC) module
**NestJS:**
- [ ] Full CRUD: `POST/GET /contracts`, `GET/PATCH/DELETE /contracts/:id`
- [ ] Links to one client + many assets (junction table)
- [ ] Billing cycle: monthly/quarterly/yearly
- [ ] Status auto-transition: `active → expiring → expired` (scheduled job)
- [ ] Renewal pipeline: expiring in 30/60/90 days
- [ ] Renewal history (`ContractRenewal` records on status change)

**Next.js:**
- [ ] Contracts list (renewal pipeline view, filter by status/cycle)
- [ ] Contract detail (value, scope, assets covered, timeline)
- [ ] Create/edit contract form (multi-select assets)
- [ ] Renewal calendar block (show upcoming renewals)

### 1.6 Service Providers + Servers module
**NestJS:**
- [ ] CRUD providers: `POST/GET /providers`, `GET/PATCH/DELETE /providers/:id`
- [ ] CRUD servers: `POST/GET /servers`, `GET/PATCH/DELETE /servers/:id`
- [ ] Server belongs to provider, hosts many assets
- [ ] Track cost, renewal date, specs, IPs

**Next.js:**
- [ ] Providers list + detail
- [ ] Servers list (groupable by provider)
- [ ] Server detail with linked assets

### 1.7 Domains module (auto-tracking)
**NestJS:**
- [ ] `POST /domains` → triggers WHOIS/RDAP lookup
- [ ] WHOIS/RDAP integration (node `whois` lib or rdap.org)
- [ ] Auto-fill: registrar, registration date, expiry, nameservers
- [ ] `GET /domains?expiring=<days>`, `GET /domains/:id`
- [ ] `PATCH /domains/:id` (manual override)
- [ ] Daily worker: `domain-whois-check` re-checks all domains, detects changes

**Next.js:**
- [ ] Domains list with expiry countdown + status indicators
- [ ] Domain detail showing WHOIS data + SSL binding
- [ ] Add domain form (enter FQDN → auto-fill)

### 1.8 SSL module (auto-tracking)
**NestJS:**
- [ ] `POST /ssl` → TLS connect to domain, read live cert
- [ ] Extract: issuer, CN + SANs, valid from/to, key type, self-signed flag
- [ ] Distinguish Let's Encrypt (auto-renew) vs manual
- [ ] Daily worker: `ssl-check` re-checks all certs, flags expiring/mismatched/weak

**Next.js:**
- [ ] SSL list with days-to-expiry, issuer, SANs
- [ ] Warning badges (self-signed, host mismatch, expired)

### 1.9 Monitoring + Incidents module
**NestJS:**
- [ ] `POST/GET /monitors`, `PATCH/DELETE /monitors/:id`
- [ ] Check types: HTTP/HTTPS/TCP/ping/keyword
- [ ] BullMQ worker: `uptime-monitor` runs checks on interval (1–5 min)
- [ ] Record: status, response time, status code per check
- [ ] Auto-incident: N consecutive fails → create `Incident`, auto-close on recovery
- [ ] `GET /monitors/:id/checks` (paginated history)
- [ ] `GET /incidents`, `GET /incidents/:id`, `PATCH /incidents/:id` (acknowledge)

**Next.js:**
- [ ] Monitors list (status lights, response times, check history chart)
- [ ] Create/edit monitor form (URL, interval, expected status, keyword)
- [ ] Incidents list (open → acknowledged → resolved timeline)
- [ ] Incident detail with MTTR, cause, notes

### 1.10 Reminders + Notifications module
**NestJS:**
- [ ] `POST/GET /reminder-rules`, `PATCH/DELETE /reminder-rules/:id`
- [ ] Rule entity: event type, trigger days, channels, recipients
- [ ] BullMQ worker: `reminder-dispatcher` — runs hourly, checks domain/SSL/contract/server expiry
- [ ] Email sending via Resend / Postmark / SES
- [ ] Multi-stage: send at 30/14/7/1 days before expiry
- [ ] Digest email (daily or weekly) — aggregates all upcoming/past-due items

**Next.js:**
- [ ] Reminder rules list + create/edit form
- [ ] Per-user notification preferences (which channels, digest frequency)

### 1.11 Dashboard + Reports module
**NestJS:**
- [ ] `GET /dashboard/stats` — aggregated KPI response (total assets, up/down, expiring, incidents, AMC value)
- [ ] `GET /reports/uptime/:assetId?month=&year=` — uptime % per period
- [ ] BullMQ worker: `monthly-report` generates PDF + email on 1st of month
- [ ] `GET /reports/renewal-pipeline` — upcoming renewals grouped

**Next.js:**
- [ ] Overview dashboard (4 KPI cards matching spec: Assets, Up now, Expiring 30d, Open incidents)
- [ ] Expiry calendar (combined view: domains, SSL, contracts, servers)
- [ ] Monthly uptime report page per client/asset
- [ ] Renewal pipeline view

### 1.12 Audit Log module
**NestJS:**
- [ ] NestJS interceptor capturing mutations on key entities → `AuditLog` table
- [ ] `GET /audit-logs?entity=&actor=&action=` (paginated, filterable)

**Next.js:**
- [ ] Audit log page (table with actor, action, entity, before/after diff, timestamp)

### 1.13 Client Portal
**Next.js:**
- [ ] Separate route group `/portal/` with client-only guard
- [ ] Portal overview (their assets, contract status, renewal dates)
- [ ] Uptime report per asset (read-only, monthly view)
- [ ] No edit/create/delete — strictly read-only
- [ ] Portal layout (simplified header, no sidebar)

### 1.14 CSV Import
**NestJS:**
- [ ] `POST /import/clients`, `POST /import/assets`, `POST /import/contracts`
- [ ] Validate, preview, confirm flow — transaction rollback on error
- [ ] Return summary: N imported, M skipped, E errors

**Next.js:**
- [ ] Import page with step wizard: upload → map columns → preview → confirm

---

## Phase 2 — Enhanced

- [ ] Ticketing / maintenance log module (lightweight ticketing with SLA, time logging)
- [ ] Slack notifications (webhook)
- [ ] WhatsApp/SMS via Twilio
- [ ] Backup tracking + overdue alerts
- [ ] DNS change detection (diff with persisted snapshot)
- [ ] Malware / blacklist monitoring (Google Safe Browsing API)
- [ ] Email digests (weekly summary of all risks)

---

## Phase 3 — Scale & Integrate

- [ ] Provider API sync (AWS, DigitalOcean, Hetzner — auto-import servers)
- [ ] Lighthouse / PageSpeed checks
- [ ] Tech-stack EOL tracking (CMS version, PHP version)
- [ ] Public status pages
- [ ] REST API + webhooks for external integration
- [ ] PWA / offline-capable portal

---

## Cross-cutting best practices

| Practice | Implementation |
|---|---|
| **Testing** | Unit (Jest) for services/guards · e2e (Supertest) for API endpoints · Playwright for critical user flows |
| **API design** | REST with OpenAPI/Swagger (`@nestjs/swagger`) — contract-first mindset |
| **Error handling** | NestJS exception filters → structured `{ error, message, statusCode, timestamp }` |
| **Validation** | Zod (shared lib for API + frontend validation), paired with Kysely's type-safe query builder |
| **Pagination** | Cursor-based for large tables (monitor checks, audit logs); page-based for entities |
| **Security** | Helmet, CORS, rate limiting, argon2 password hashing, JWT rotation every 15 min |
| **DB indexing** | Index `expiry_date`, `status`, `client_id`, `asset_id`, `monitor_id`, `entity_type` |
| **Idempotency** | BullMQ job dedup + monitoring check dedup to prevent double-incidents |
| **Monitoring** | App health endpoint (`/health`), Prometheus metrics optional |
| **Git flow** | `main` (stable) → `develop` → `feature/*` branches; squash-merge PRs |

---

## Folder structure (recommended)

```
amc-api/                      # NestJS repo
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── clients/
│   │   ├── assets/
│   │   ├── contracts/
│   │   ├── providers/
│   │   ├── servers/
│   │   ├── domains/
│   │   ├── ssl/
│   │   ├── monitoring/
│   │   ├── incidents/
│   │   ├── reminders/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── dashboard/
│   │   ├── audit/
│   │   ├── portal/
│   │   └── import/
│   ├── common/               # guards, decorators, pipes, filters
│   ├── config/               # env validation
│   ├── workers/              # BullMQ processor definitions
│   ├── db/                   # Kysely schema, migrations, seed
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── seed.ts
│   └── main.ts
├── test/
├── docker-compose.yml        # PostgreSQL + Redis
├── Dockerfile
└── package.json

amc-web/                      # Next.js repo
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── portal/
│   ├── components/
│   ├── lib/                  # api client, utils, hooks
│   └── styles/
├── public/
├── Dockerfile
└── package.json

@amc/shared                   # private npm package
├── src/
│   ├── schemas/              # Zod schemas
│   └── types/                # shared TS types
└── package.json
```
