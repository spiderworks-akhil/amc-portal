# AMC Management CRM — Build Guide (Audited 2026-06-22)

> ⚠️ **This document was re-audited on 2026-06-22.** Several modules previously marked as stubs or incomplete have since been fully implemented. Below is the current verified state.

> Based on `index.html` (Requirement Sheet v1).
> Stack: **NestJS + Kysely + PostgreSQL** | **Next.js (App Router) + Tailwind + shadcn/ui** | **Redis + BullMQ**


## Immediate Next Tasks (priority order)

### 1. Build Providers List + Detail Pages (Frontend)
**Status:** Backend CRUD is 100% complete (272 lines, batch enrichment with domain/server counts, conflict checks). Frontend has only a `create-provider-dialog.tsx` component used within servers/assets pages. No dedicated list/detail pages exist. The sidebar does **not** currently link to `/providers`. This is the highest-impact feature because:
- Backend is done — just needs list page, detail page, create/edit form
- Use the same patterns as Clients/Contracts/Servers pages
- **Files to create:** `app/(main-pages)/providers/page.tsx`, `components/providers/providers-page-content.tsx`, `components/providers/providers-grid.tsx`, `components/providers/provider-card.tsx`, `components/providers/provider-detail.tsx`

### 2. Add Health Endpoint
**Status:** No `/health` endpoint exists. The app has no way to check DB/Redis connectivity status without calling actual data endpoints. Build a simple health check that pings PostgreSQL via Kysely and Redis via the existing Redis module. Return `{ status, db, redis, timestamp }`.

### 3. Add Date Range Filter to SSL List Page
**Status:** Domains page has date range filtering. The SSL list page only has search + type dropdown. Add a date range picker (from/to expiry date) similar to the domains page pattern.

### 4. Add Auto-Renew Toggle to SSL List Filter
**Status:** SSL list page lacks an auto-renew toggle filter (domains page has one). Add a toggle to filter SSL certs by auto-renew status.

---

## Quick Wins (can be done in parallel with above)

- **Add health endpoint** (`/health`) — check DB + Redis connectivity
- **Add auto-renew toggle to SSL list filter** (like domains page has)
- **Add date range filter to SSL list page** (domains page already has one)
- **Fix root `GET /`** — replace `"Hello World!"` placeholder with a useful redirect or health summary

---

## What's Done ✅

| Module | Backend | Frontend |
|---|---|---|---|
| Auth | ✅ Exchange/refresh/me/logout | ✅ Login via credentials |
| Users | ✅ Service with DB queries | ✅ List page |
| Clients | ✅ CRUD + contacts + managers | ✅ List + detail + edit |
| Assets | ✅ CRUD + types + tags | ✅ List + detail + edit |
| Contracts | ✅ CRUD + renewals + status | ✅ List + detail + **create/edit drawers** |
| Domains | ✅ CRUD + WHOIS/RDAP + status filter + snapshots | ✅ List + detail + edit + status filters + RBAC banner + **create drawer** |
| SSL | ✅ CRUD + TLS check + expiry stats + snapshots | ✅ List + detail + edit + **warning badges** |
| Servers | ✅ CRUD + providers + cost tracking | ✅ List + detail + edit |
| Providers | ✅ CRUD (272 lines, batch enrichment) | ⚠️ Create dialog only — **no list/detail pages** |
| Monitors | ✅ CRUD + HTTP/TCP/ping/keyword checks + incident auto-create/resolve + BullMQ scheduling | ✅ List + detail + check history + create/edit drawers |
| Incidents | ✅ CRUD + cron jobs for expired domain/SSL + check-expired endpoint | ✅ List (filterable/paginated) + detail with timeline |
| Dashboard | ✅ Consolidated `/dashboard/overview` endpoint + RBAC | ✅ Component-based (10+ files) |
| Audit Log | ✅ Full CRUD + filtering + pagination | ✅ List + detail pages |
| Reminders | ✅ Full CRUD + rules + dispatcher + cleanup cron | ✅ List page (labeled Notifications) |
| Notifications | ✅ SSE real-time in-app (RxJS) | ✅ Bell icon / reminder page |
| Email | ✅ Nodemailer sending service | N/A |
| Redis | ✅ Client module + service + controller | N/A |
| BullMQ | ✅ 3 queues + cron bootstrap + queue service | N/A |
| Jobs/Workers | ✅ domain-refresh, ssl-refresh, monitor-check processors | N/A |
| Expiry Calendar | N/A | ✅ Full calendar page |
| Reports | ❌ Not started | ❌ Not started |
| Client Portal | ❌ Not started | ❌ Not started |
| CSV Import | ❌ Not started | ❌ Not started |
| Health Endpoint | ❌ Not started | ❌ Not started |

---

## Phase 0 — Foundation (scaffold both apps)

### 0.1 Repo setup
- [x] Create monorepo with `amc-backend` (NestJS) + `amc-frontend` (Next.js)

### 0.2 Database
- [x] Docker Compose with Redis 7
- [x] Full Kysely type generation via `kysely-codegen` (25 tables)
- [x] 11 timestamped migrations covering all Phase 1 entities
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
- [x] Auth context / session management
- [x] Layout shell: sidebar nav + topbar



## Phase 1 — MVP (NestJS modules + Next.js pages)

### 1.1 Auth module
- [x] Exchange/refresh/me/logout endpoints
- [x] JWT token strategy with httpOnly cookie
- [x] Rate limiting on auth endpoints
- [x] Login page
- [x] Auth middleware wrapping protected routes

### 1.2 Users module
- [x] Full CRUD (read-only in practice)
- [x] List page
- [ ] Notification preferences (email digest on/off, reminder channels)

### 1.3 Clients module
- [x] Full CRUD, multiple contacts, tags, custom fields
- [x] Filter: status, tag, account manager, search query
- [x] Full frontend: list, detail, create/edit, contacts, managers
- [ ] CSV import endpoint (multer + papaparse)

### 1.4 Assets module
- [x] Full CRUD with type enum, tags, custom fields
- [x] Linked to primary domain, server, contract
- [x] Full frontend: list, detail, create/edit
- [ ] Bulk actions (archive, reassign, export CSV)

### 1.5 Contracts (AMC) module
- [x] Full CRUD with billing cycles, status auto-transition, renewal history
- [x] Frontend: list page (renewal pipeline view) + detail page
- [x] Create/edit contract form (multi-select assets) via drawers
- [ ] Renewal calendar block (show upcoming renewals in calendar view)

### 1.6 Service Providers + Servers module
- [x] Full CRUD for both providers and servers
- [x] Track cost, renewal date, specs, IPs
- [x] Frontend: full servers list + detail + edit

### 1.7 Domains module (auto-tracking)
- [x] Full CRUD + WHOIS/RDAP auto-fill + snapshot history
- [x] Status filter (expired/expiring_soon/active) + RBAC filtering
- [x] Full frontend: list with expiry countdown + detail with edit
- [x] Standalone domain create form (enter FQDN → auto-fill) via drawer
- [ ] Daily batch WHOIS worker (individual cron scheduling exists but no bulk daily run)

### 1.8 SSL module (auto-tracking)
- [x] Full CRUD + TLS check + snapshot history + expiry stats
- [x] Full frontend: list + detail + edit
- [x] Warning badges (self-signed, host mismatch, expired)
- [ ] Daily batch TLS worker (individual cron scheduling exists but no bulk daily run)

### 1.9 Monitoring + Incidents module
- [x] Full CRUD for monitors
- [x] Check types: HTTP/HTTPS/TCP/ping/keyword all implemented
- [x] BullMQ worker for uptime checks with per-monitor intervals
- [x] Auto-incident creation after 3 consecutive failures, auto-resolve on recovery
- [x] Per-check history (paginated)
- [x] Full frontend: list + detail + create/edit drawers
- [x] Full incident management: list (filterable/paginated) + detail (timeline, acknowledge, resolve)
- [x] Cron jobs: expired domains & SSL auto-create incidents every 6 hours
- [x] Manual "Check Expired" endpoint + button in incidents list page

### 1.10 Reminders + Notifications module
- [x] Full backend CRUD (service, controller, DTOs)
- [x] Reminder rules CRUD (ReminderRulesService + controller)
- [x] Dispatcher service — cron that creates pending reminders from rules and sends due reminders
- [x] Cleanup service — weekly cron purging old sent reminders and escalated orphaned ones
- [x] In-app SSE notifications (real-time via RxJS)
- [x] Frontend list page (accessible via sidebar "Notifications")
- [ ] Email sending integration for reminders

### 1.11 Dashboard + Reports module
- [x] Consolidated `/dashboard/overview` endpoint (single API call replaces 6)
- [x] Component-based frontend (10+ component files)
- [x] CriticalAlertsBanner with RBAC filtering
- [x] Stat cards, domain health, expiring domains/contracts/SSL, quick actions
- [x] Expired domains + expired SSL sections with red urgency cards
- [x] Expiry calendar (combined view: domains, SSL, contracts, servers)
- [ ] Monthly uptime report page per client/asset
- [ ] Renewal pipeline view
- [ ] PDF report generation

### 1.12 Audit Log module
- [x] Full backend CRUD (create, paginated list with filters, get by ID, recent)
- [x] Frontend list + detail pages (entity type filtering, pagination, before/after values displayed)

### 1.13 CSV Import
- [ ] Not started


## Phase 2 — Enhanced

- [ ] Ticketing / maintenance log module
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

| Practice | Notes |
|---|---|
| **Testing** | Unit tests exist for some services (Jest). e2e setup has pre-existing error. |
| **API design** | RESTful. Swagger not yet set up. |
| **Error handling** | NestJS exception filters → structured error responses |
| **Validation** | Kysely's type-safe query builder + `class-validator` DTOs |
| **Pagination** | Page-based for all entities |
| **Security** | JWT, rate limiting. Helmet/CORS configured. |
| **DB indexing** | Present on key columns: `expiry_date`, `status`, `client_id`, `asset_id`, `monitor_id` |
| **Idempotency** | Incident dedup by consecutive failures. Job dedup via job IDs. |
| **Monitoring** | No health endpoint yet (**→ quick win**). |

---

## Folder structure

```
amc-backend/
├── src/
│   ├── modules/            # 16 modules (auth, users, clients, assets, contracts,
│   │                       #   providers, servers, domains, ssl, monitor, incident,
│   │                       #   dashboard, audit-log, reminder, notification, email)
│   ├── common/             # guards, decorators, interceptors, pipes
│   ├── db/                 # Kysely migrations (11), types.generated.ts, database.module
│   ├── jobs/               # BullMQ processors (3)
│   ├── queue/              # Queue module + service + cron bootstrap
│   ├── redis/              # Redis module + service + controller
│   └── scripts/            # migrate.ts, seed.ts, create-migration.ts

amc-frontend/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── (main-pages)/       # 13 route groups (assets, audit-logs, clients, contracts,
│   │                       #   dashboard, domains, expiry-calendar, incidents, monitors,
│   │                       #   reminders, servers, ssl-certificates)
│   └── api/                # API proxy routes
├── components/             # 20+ component categories (dashboard, ui, domains, etc.)
├── hooks/                  # 13 TanStack Query hooks
├── lib/                    # api-client.ts, auth.ts, format-utils.ts, utils.ts
└── types/                  # api.ts (all frontend TypeScript interfaces)
```
