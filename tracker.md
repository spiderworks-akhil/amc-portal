# AMC Tracking Engines — Build Tracker (Audited 2026-06-18)

> ⚠️ **This document was audited and rewritten on 2026-06-18.** The previous version was significantly outdated — Redis, queues, jobs, monitors, and incidents are all fully implemented now.

> Stack: NestJS + Kysely + PostgreSQL | Redis 7 + BullMQ | node-rdap + whoiser

---

## Current State

### What Exists

| Component | Status | Notes |
|---|---|---|
| `src/queue/queue.module.ts` | ✅ Real | Registers 3 BullMQ queues (`monitor-checks`, `domain-refresh`, `ssl-refresh`) with Redis connection |
| `src/queue/queue.service.ts` | ✅ Real | Schedule/remove/trigger methods for all queues + cron bootstrap on startup |
| `src/queue/cron-bootstrap.service.ts` | ✅ Real | Auto-schedules existing domains & SSL on app boot |
| `src/redis/redis.module.ts` | ✅ Real | Global Redis client module |
| `src/redis/redis.service.ts` | ✅ Real | ioredis wrapper with connect/quit |
| `src/redis/redis.controller.ts` | ✅ Real | Redis health check endpoint |
| `src/jobs/domain-refresh.processor.ts` | ✅ Real | BullMQ worker for WHOIS domain refresh |
| `src/jobs/ssl-refresh.processor.ts` | ✅ Real | BullMQ worker for TLS certificate refresh |
| `src/jobs/monitor-check.processor.ts` | ✅ Real | BullMQ worker for uptime monitoring checks |
| `src/modules/ssl/` | ✅ Full CRUD + TLS check | `triggerCheck()`, `lookupSslCertDetails()`, snapshots, expiry stats |
| `src/modules/domain/` | ✅ Full CRUD + WHOIS/RDAP | Full RDAP→WHOIS→DNS chain, registrar auto-detect |
| `src/modules/monitor/` | ✅ Full CRUD + check execution | HTTP/HTTPS/TCP/ping/keyword checks + incident auto-create/resolve |
| `src/modules/incident/` | ✅ Full CRUD + cron jobs | Create/list/getById/resolve/acknowledge + checkExpiredDomains/Ssl cron |
| `src/modules/reminder/` | ⚠️ Stub | Service returns placeholder strings. Controller uses `+id` |
| `src/modules/audit-log/` | ⚠️ Stub | Service returns placeholder strings. Controller uses `+id` |
| `GET /dashboard/overview` | ✅ Done | Consolidated endpoint replaces 6 separate API calls |
| `@nestjs/schedule` | ✅ Installed | `ScheduleModule.forRoot()` in `IncidentModule` |
| Docker Redis | ✅ Running | `redis:7-alpine` on port 6379 |

---

## Remaining Work (in priority order)

### P0 — Fix stubs
- [ ] **Fix `audit-log.controller.ts`** — Replace `+id` with `ParseUUIDPipe`, implement real service
- [ ] **Fix `reminder.controller.ts`** — Replace `+id` with `ParseUUIDPipe`, implement real service
- [ ] Implement `AuditLogService` with real DB queries
- [ ] Implement `ReminderService` with real DB queries

### P1 — Notifications & Reminders
- [ ] Implement notification sending (email via Resend/Nodemailer)
- [ ] Build reminder dispatch logic (hourly cron job checking for upcoming expiries)
- [ ] Create email templates for domain/SSL/contract expiry warnings
- [ ] Add notification history tracking

### P2 — Caching
- [ ] Cache dashboard summary data in Redis (TTL: 5 minutes)
- [ ] Cache keys: `dashboard:summary`, `dashboard:domain-stats`, `dashboard:ssl-stats`, `dashboard:expiring-contracts`
- [ ] Invalidate cache on create/update/delete events

### P3 — Advanced Features
- [ ] Monthly uptime report generator (PDF + email)
- [ ] Server renewal tracking worker
- [ ] Contract status auto-transition worker
- [ ] Weekly digest emails

---

## Worker Schedule Summary

| Worker | Queue Name | Schedule | Status |
|---|---|---|---|
| Domain WHOIS Check | `domain-refresh` | Per-domain cron (configurable) | ✅ Real |
| SSL TLS Check | `ssl-refresh` | Per-cert cron (configurable) | ✅ Real |
| Uptime Monitor | `monitor-checks` | Per-monitor interval (configurable) | ✅ Real |
| Reminder Dispatcher | N/A | Not implemented | ❌ |
| Contract Status Check | N/A | Not implemented | ❌ |
| Server Renewal Check | N/A | Not implemented | ❌ |
| Monthly Report | N/A | Not implemented | ❌ |

---

## API Endpoints Summary

### Fully Implemented
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/overview` | Consolidated dashboard data |
| `POST` | `/incident/check-expired` | Manual trigger for domain/SSL expiry check |
| `POST` | `/monitors/:id/check` | Manual uptime check trigger |
| `GET` | `/monitors/:id/checks` | Paginated check history |
| `POST` | `/domains/:id/check` | Manual WHOIS check |
| `GET` | `/domains/snapshots` | Domain snapshot history |
| `POST` | `/ssl/:id/check` | Manual TLS check |
| `GET` | `/ssl/snapshots` | SSL snapshot history |
| All CRUD | All entity endpoints | Full CRUD on all modules except stubs |

### Not Yet Implemented
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/redis` | Redis health check (controller exists but route may not) |
| `POST` | `/domains/check-all` | Trigger all WHOIS checks |
| `POST` | `/ssl/check-all` | Trigger all TLS checks |
| `GET` | `/incidents/stats` | Incident statistics |
| All | `/reminder-rules/*` | Reminder rule CRUD (stub) |
| All | `/audit-log/*` | Audit log endpoints (stub) |
| All | `/reports/*` | Report generation (not started) |

---

## Dependencies Status

| Package | Status |
|---|---|
| `@nestjs/schedule` | ✅ Installed |
| `@nestjs/bullmq` | ✅ Installed |
| `bullmq` | ✅ Installed |
| `ioredis` | ✅ Installed (via `redis` npm package) |
| `nodemailer` / `resend` | ❌ Not installed |
| `@nestjs/swagger` | ❌ Not installed |
