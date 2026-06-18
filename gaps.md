# AMC Portal — Gaps Analysis (Audited 2026-06-18)

> ⚠️ **This document was audited and rewritten on 2026-06-18.** The previous version was significantly outdated. Below is the current state.

---

## Critical Gaps (blocking user workflows)

| Gap | Backend | Frontend | Notes |
|---|---|---|---|
| **Contracts create/edit** | ✅ Full CRUD | ❌ No create or edit form in UI | List + detail pages exist. Users cannot create contracts. |
| **Domain standalone create form** | ✅ POST /domains | ❌ No standalone "Add Domain" UI | Only accessible via the asset detail page's create-domain-form |
| **Providers list + detail pages** | ✅ Full CRUD | ❌ No list/detail pages | Only a `create-provider-dialog.tsx` component exists |
| **Audit Log module** | ⚠️ Stub service | ❌ No pages | Service returns placeholder strings. Controller uses `+id` (number) instead of `ParseUUIDPipe` |
| **Reminder module** | ⚠️ Stub service | ❌ No pages | Service returns placeholder strings. Controller uses `+id` (number) instead of `ParseUUIDPipe` |

## Fully Implemented Modules (no action needed)

| Module | Backend | Frontend | Notes |
|---|---|---|---|
| **Auth** | ✅ Real | ✅ Login page | JWT + refresh + httpOnly cookie |
| **Users** | ✅ Real service | ✅ List page | |
| **Clients** | ✅ Full CRUD + contacts + managers | ✅ List + detail + create/edit | |
| **Assets** | ✅ Full CRUD + types + servers | ✅ List + detail + create/edit | |
| **Contracts** | ✅ Full CRUD + renewals + status | ✅ List + detail (no create/edit) | |
| **Servers** | ✅ Full CRUD + providers | ✅ List + detail + edit | |
| **Domains** | ✅ Full CRUD + WHOIS/RDAP + snapshots | ✅ List + detail + edit + status filters | |
| **SSL** | ✅ Full CRUD + TLS check + snapshots | ✅ List + detail + edit | |
| **Monitors** | ✅ Full CRUD + HTTP/TCP/ping/keyword checks + incident auto-create/resolve | ✅ List page + detail page with check history | Fully implemented with BullMQ scheduling |
| **Incidents** | ✅ Full CRUD + cron jobs for expiry incidents | ✅ List page (filterable/paginated) + detail page with timeline | Built out recently |
| **Dashboard** | ✅ Consolidated `/dashboard/overview` endpoint | ✅ Component-based (10+ files) | |
| **Providers** | ✅ Full CRUD | ❌ No list/detail pages | Only a `create-provider-dialog` exists |

## Infrastructure Status

| Component | Status | Details |
|---|---|---|
| **Redis** | ✅ Real | `redis.service.ts`, `redis.module.ts`, `redis.controller.ts` — ioredis client |
| **BullMQ Queues** | ✅ Real | 3 queues: `monitor-checks`, `domain-refresh`, `ssl-refresh` |
| **Queue Service** | ✅ Real | Full `QueueService` with schedule/remove/trigger methods for all queues |
| **Cron Bootstrap** | ✅ Real | `CronBootstrapService` auto-schedules existing domains & SSL on startup |
| **Jobs/Processors** | ✅ Real | `domain-refresh.processor.ts`, `ssl-refresh.processor.ts`, `monitor-check.processor.ts` |
| **Cron Scheduler** | ✅ Real | `@nestjs/schedule` installed, `ScheduleModule.forRoot()` in `IncidentModule` |
| **Health endpoint** | ❌ Not implemented | No `/health` endpoint |
| **Caching layer** | ❌ Not implemented | No Redis caching for expensive queries |
| **Notification delivery** | ❌ Not implemented | No email/SMS sending |

## Not Started Modules (Phase 1 scope)

| Module | Notes |
|---|---|
| **Audit Log** | Backend is a stub service. No frontend pages. |
| **Reminders** | Backend is a stub service. No frontend pages. |
| **Reports** | Not started at all. |
| **Client Portal** | Not started at all (was supposed to be v1 scope). |
| **CSV Import/Export** | Not started at all. |

## UI/UX Gaps

| Gap | Details |
|---|---|
| **Contracts create/edit form** | Biggest UX gap — users can't create or edit contracts from the UI |
| **Providers list + detail pages** | Backend CRUD is 100% complete, just needs frontend |
| **Domain standalone create form** | Only accessible through asset detail — should have its own flow |
| **Bulk actions missing** | No select-and-perform-action patterns on list pages |
| **No export to PDF/CSV** | No data export on any list page |
| **No dark mode toggle** | Theme is dark by default but no toggle |
| **No keyboard shortcuts** | No power-user accelerators |
| **Responsive gaps** | Some complex tables may overflow on mobile (not verified) |

## Tech Debt / Code Quality

| Issue | Location | Severity |
|---|---|---|
| `+id` coercion instead of `ParseUUIDPipe` | `audit-log.controller.ts`, `reminder.controller.ts` | High (would fail on UUIDs) |
| `console.log` left in production code | `smooth-select.tsx:43` | Low |
| TypeScript error (pre-existing) | `calendar.tsx:181` | Medium |
| TypeScript e2e test error | `test/app.e2e-spec.ts:20` | Low (pre-existing) |
| No pre-commit hooks | Project root | Low |
| No CI/CD configuration | Project root | Medium |
| No Docker Compose for PostgreSQL | Only Redis is dockerized | Low |

## Module Cross-Reference (Current State)

| Module | Backend CRUD | Backend Real Logic | Frontend List | Frontend Detail | Frontend Create/Edit |
|---|---|---|---|---|---|
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contracts | ✅ | ✅ | ✅ | ✅ | ❌ |
| Servers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Domains | ✅ | ✅ | ✅ | ✅ | ⚠️ (via asset only) |
| SSL | ✅ | ✅ | ✅ | ✅ | ⚠️ (via domain detail) |
| Monitors | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | N/A | ✅ | ✅ | N/A | N/A |
| Providers | ✅ | ✅ | ❌ | ❌ | ⚠️ (dialog only) |
| Auth | Partial | ✅ | N/A | N/A | N/A |
| Users | Read-only | ✅ | ❌ | ❌ | ❌ |
| Incidents | ✅ | ✅ | ✅ | ✅ | N/A |
| Audit Log | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ |
| Reminders | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ |
| Reports | ❌ | ❌ | ❌ | ❌ | ❌ |
| Client Portal | ❌ | ❌ | ❌ | ❌ | ❌ |
| CSV Import | ❌ | ❌ | ❌ | ❌ | ❌ |

## Recommendation Priority

### P0 — Must fix
1. **Build Contracts create/edit form** — biggest UX gap
2. **Build Providers list + detail pages** — backend is done, just needs UI
3. **Fix UUID coercion bug** in `audit-log.controller.ts` and `reminder.controller.ts` (`+id` → `ParseUUIDPipe`)
4. **Fix the 3 stub services** (audit-log, reminder) — or remove them if not planned yet

### P1 — Should build
5. **Domain standalone create form** — enter FQDN → auto-fill via WHOIS
6. **Implement notification service** — email for expiring domains, SSL, contracts
7. **Client Portal** — was supposed to be v1 scope

### P2 — Nice to have
8. Docs: Update `tracker.md` and `guide.md` (⚠️ still outdated)
9. Reports module (PDF export)
10. CSV import/export for all entities
11. Health check endpoint
12. Redis caching layer for dashboard stats
13. Dark mode toggle
14. CI/CD pipeline
15. Pre-commit hooks
