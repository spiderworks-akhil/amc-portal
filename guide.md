# AMC Management CRM — Build Guide

> Based on `index.html` (Requirement Sheet v1).  
> Stack: **NestJS + Kysely + PostgreSQL** | **Next.js (App Router) + Tailwind + shadcn/ui** | **Redis + BullMQ**

---

## Immediate Next Tasks (priority order)

### 1. Build Providers List + Detail Pages (Frontend)
**Status:** Backend CRUD is 100% complete. Sidebar links to `/providers` but no page exists. Only a `create-provider-dialog.tsx` component exists. This is the **highest-impact** feature to build next because:
- Backend is done — just needs list page, detail page, create/edit form
- Unblocks server-provider context (servers reference providers)
- Use the same patterns as Clients/Contracts/Servers pages
- **Files to create:** `app/(main-pages)/providers/page.tsx`, `components/providers/providers-page-content.tsx`, `components/providers/providers-grid.tsx`, `components/providers/provider-card.tsx`, `components/providers/provider-detail.tsx`

### 2. Add Create/Edit Contract Form
**Status:** Backend CRUD is done. Contracts list + detail pages exist. But there's no create/edit form — users can't create or update contracts from the UI. The contract detail page needs an edit button + drawer (similar to the domain/SSL/server detail page pattern).

### 3. Build Monitors List Page (Frontend)
**Status:** Backend module doesn't exist yet. The frontend is just a placeholder stub. Before building the frontend, the backend `monitoring` module needs to be scaffolded with:
- `Monitors` entity (HTTP/HTTPS/TCP/ping/keyword check types)
- `MonitorChecks` entity (status, response time, status code per check)
- `Incidents` entity (auto-created after N consecutive failures)
- CRUD endpoints + BullMQ worker for running checks
- Then build the frontend list + detail pages

### 4. Add Domain Create Form
**Status:** Backend `POST /domain` exists. The domain list page exists. But there's no "Add Domain" button/form. Users can only add domains through the asset detail page's create-domain-form component. Need a standalone domain creation flow (enter FQDN → auto-fill via the existing `/domain/verify-fqdn` endpoint).

### 5. Add SSL Warning Badges
**Status:** SSL list/detail pages exist but don't show warning badges for self-signed certificates, hostname mismatches, or expired certs. The backend `days_to_expiry` computation exists — just need frontend badge rendering.

### 6. Apply RBAC Filtering to All Dashboard Sections
**Status:** The `CriticalAlertsBanner` now filters by `manager_id` (server-side), but `useDomainExpiryStats`, `useExpiringContracts`, and `useExpiringSsl` still return global data. For consistent RBAC, these need the same `manager_id` filter treatment.

---

## Quick Wins (can be done in parallel with above)

- **Clean up `console.log` in `components/ui/smooth-select.tsx`** line 43
- **Fix pre-existing `calendar.tsx` TS error** (line 181: `'caption' does not exist in type 'Partial<ClassNames>'`)
- **Add date range filter to SSL list page** (domains page already has one)
- **Add auto-renew toggle to SSL list filter** (like domains page has)
- **Extract EXPIRING_SOON_DAYS constant** (currently hardcoded to 30 in both backend status filter and frontend)

---

## What's Done ✅

| Module | Backend | Frontend |
|---|---|---|
| Auth | ✅ Exchange/refresh/me/logout | ✅ Login via next-auth |
| Users | ✅ CRUD | ✅ List page |
| Clients | ✅ CRUD + contacts + managers | ✅ List + detail + edit |
| Assets | ✅ CRUD + types + tags | ✅ List + detail + edit |
| Contracts | ✅ CRUD + renewals + status | ✅ List + detail (no create/edit form) |
| Domains | ✅ CRUD + WHOIS + status filter + manager_id filter | ✅ List + detail + edit + status filter + RBAC banner |
| SSL | ✅ CRUD + TLS check + expiry | ✅ List + detail + edit |
| Servers | ✅ CRUD + providers + update | ✅ List + detail + edit |
| Providers | ✅ CRUD | ⚠️ Only create dialog — **no list/detail pages** |
| Dashboard | ✅ Summary + expiring endpoints with RBAC | ✅ Component-based (10 files) + RBAC critical alerts |
| Monitoring | ❌ Not started | ❌ Placeholder stub |
| Reminders | ❌ Not started | ❌ Not started |
| Audit Log | ❌ Not started | ❌ Not started |
| Reports | ❌ Not started | ❌ Not started |
| Client Portal | ❌ Not started | ❌ Not started |
| CSV Import | ❌ Not started | ❌ Not started |

### Shared Components
- `components/common/detail-row.tsx` — `DetailRow` + `EmptyState` (used by domain, SSL, server detail pages)
- `components/common/loader.tsx` — Loading spinner
- `components/common/session-refresher.tsx` — JWT refresh logic

---

## Phase 0 — Foundation (scaffold both apps)

### 0.1 Repo setup
- [x] Create two repos: `amc-api` (NestJS) and `amc-web` (Next.js) — _monorepo with `amc-backend` + `amc-frontend`_

### 0.2 Database
- [ ] Docker Compose: PostgreSQL 16 + Redis 7 _(only Redis present in docker-compose; PG runs externally)_
- [x] `db/types.generated.ts` — full Kysely type definitions covering all Phase 1 entities
- [x] Kysely migrations for each table (8 timestamped migrations)
- [x] Seed script: sample clients, assets, domains, SSL certs
- [x] Run migrations + seed in dev

### 0.3 NestJS scaffolding
- [x] Global pipes, filters, interceptors
- [x] Config module (`@nestjs/config`) — typed env vars
- [x] Database module (Kysely singleton)
- [x] Logger (Pino) + structured logging

### 0.4 Next.js scaffolding
- [x] `create-next-app` with App Router + TypeScript
- [x] Tailwind config + shadcn/ui init
- [x] TanStack Query provider + Axios instance with interceptors
- [x] Auth context / session management (next-auth)
- [x] Layout shell: sidebar nav + topbar

### 0.5 Dev tooling
- [ ] Pre-commit hooks (husky, lint-staged)
- [ ] CI: lint → typecheck → test → build per PR (`.github/` missing)
- [ ] GitHub issue/PR templates

---

## Phase 1 — MVP (NestJS modules + Next.js pages)

### 1.1 Auth module
**NestJS:**
- [x] `POST /auth/exchange-token`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`
- [x] JWT token strategy with httpOnly cookie
- [x] Rate limiting on auth endpoints (`@nestjs/throttler`)

**Next.js:**
- [x] Login via next-auth with credentials provider
- [x] Auth middleware wrapping protected routes
- [x] Session persistence via httpOnly cookie

### 1.2 Users module
**NestJS:**
- [x] Full CRUD: `GET /users`, `GET /users/:id`, `PATCH /users/:id`
- [ ] Notification preferences (email digest on/off, reminder channels)

### 1.3 Clients module
**NestJS:**
- [x] Full CRUD: `POST/GET /clients`, `GET/PATCH/DELETE /clients/:id`
- [x] Multiple contacts per client (separate table)
- [x] Tags (join table) + custom fields (JSON)
- [x] Filter: status, tag, account manager, search query
- [ ] CSV import endpoint (multer + papaparse)

**Next.js:**
- [x] Clients list page (filterable table + search)
- [x] Client detail page (summary card, contacts, managers, asset creation)
- [x] Create/edit client form + contacts + managers
- [ ] CSV import UI (drag-drop + preview + map columns)

### 1.4 Assets module
**NestJS:**
- [x] Full CRUD: `POST/GET /assets`, `GET/PATCH/DELETE /assets/:id`
- [x] Belongs to one client, re-assignable
- [x] Type enum + admin-definable custom types (`AssetType` entity)
- [x] Tags + custom fields (JSON)
- [x] Linked to primary domain, server, contract

**Next.js:**
- [x] Assets list (filterable by type, client, status, search)
- [x] Asset detail page with linked servers, contracts, edit form
- [x] Create/edit asset form with type-dependent fields
- [ ] Bulk actions (archive, reassign, export CSV)

### 1.5 Contracts (AMC) module
**NestJS:**
- [x] Full CRUD: `POST/GET /contracts`, `GET/PATCH/DELETE /contracts/:id`
- [x] Links to one client + many assets (junction table)
- [x] Billing cycle: monthly/quarterly/yearly
- [x] Status auto-transition logic
- [x] Renewal pipeline: expiring in 30/60/90 days
- [x] Renewal history (`ContractRenewal` records)

**Next.js:**
- [x] Contracts list page (renewal pipeline view, filter by status/cycle) — _implemented_
- [x] Contract detail (value, scope, assets covered, timeline) — _implemented_
- [ ] Create/edit contract form (multi-select assets)
- [ ] Renewal calendar block (show upcoming renewals)

### 1.6 Service Providers + Servers module
**NestJS:**
- [x] CRUD providers: `POST/GET /providers`, `GET/PATCH/DELETE /providers/:id`
- [x] CRUD servers: `POST/GET /servers`, `GET/PATCH/DELETE /servers/:id` + `PUT /servers/:id`
- [x] Server belongs to provider, hosts many assets
- [x] Track cost, renewal date, specs, IPs

**Next.js:**
- [ ] **→ NEXT TASK** Providers list + detail
- [x] Servers list (groupable by provider) — _implemented_
- [x] Server detail with edit/delete/quick-info-bar + linked assets — _implemented_
- [x] `ServerEditForm` drawer component — _implemented_
- [x] `useUpdateServer` hook — _implemented_

### 1.7 Domains module (auto-tracking)
**NestJS:**
- [x] `POST/GET /domains/list`, `GET/PATCH/DELETE /domains/:id` + `status` filter (expired/expiring_soon/active)
- [x] WHOIS check endpoint (`POST /domains/:id/check`) + snapshot history
- [x] `GET /domains/expiring?days=&manager_id=` — now supports RBAC filtering via `manager_id`
- [x] `GET /domains/stats`, `GET /domains/:id` with SSL certs
- [ ] Daily worker: `domain-whois-check` re-checks all domains (no BullMQ workers exist)

**Next.js:**
- [x] Domains list with expiry countdown + status indicators + status filter dropdown — _implemented_
- [x] Domain detail with edit/delete/quick-info-bar + WHOIS history — _implemented_
- [ ] Add domain form (enter FQDN → auto-fill)

### 1.8 SSL module (auto-tracking)
**NestJS:**
- [x] `POST/GET /ssl/list`, `GET/PATCH/DELETE /ssl/:id`
- [x] TLS check endpoint (`POST /ssl/:id/check`) + snapshot history
- [x] Expiry stats (`GET /ssl/stats`, `GET /ssl/expiring?days=`)
- [ ] Daily worker: `ssl-check` re-checks all certs (no BullMQ workers exist)

**Next.js:**
- [x] SSL list with days-to-expiry, issuer, SANs — _implemented_
- [x] SSL detail with edit/delete/quick-info-bar + check history — _implemented_
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
- [ ] Monitors list (status lights, response times) — currently a stub page
- [ ] Create/edit monitor form
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
- [x] `GET /dashboard/summary` — aggregated KPI response
- [x] `GET /domain/expiring?days=&manager_id=` — RBAC-aware expiring domains
- [ ] `GET /reports/uptime/:assetId?month=&year=` — uptime % per period
- [ ] BullMQ worker: `monthly-report` generates PDF + email on 1st of month
- [ ] `GET /reports/renewal-pipeline` — upcoming renewals grouped

**Next.js:**
- [x] Overview dashboard — component-based architecture (10 files in `components/dashboard/`)
- [x] `CriticalAlertsBanner` with RBAC filtering (server-side `manager_id`)
- [x] Stat cards, domain health, expiring domains/contracts/SSL, client health, quick actions
- [x] Expired domains + expired SSL sections with red urgency cards
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
