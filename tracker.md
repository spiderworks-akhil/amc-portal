# AMC Tracking Engines — Build Tracker

> Status: **Phase 1 — Infrastructure + Background Jobs**
> Stack: NestJS + Kysely + PostgreSQL | Redis 7 + BullMQ | node-rdap + whoiser

---

## Current State

### What Exists
| Component | Status | Notes |
|---|---|---|
| `src/queue/queue.module.ts` | 🔲 Stub | Empty service, no BullMQ wiring |
| `src/queue/queue.service.ts` | 🔲 Stub | Empty class |
| `src/redis/` | 🔲 Empty dir | No Redis client module |
| `src/jobs/` | 🔲 Empty dir | No worker definitions |
| `src/modules/ssl/` | ✅ CRUD + manual check | `triggerCheck()`, `lookupSslCertDetails()`, snapshots |
| `src/modules/domain/` | ✅ CRUD + WHOIS/RDAP | `triggerCheck()`, `lookupDomainDetails()`, RDAP→WHOIS→DNS chain, registrar auto-detect |
| `src/modules/incident/` | 🔲 Scaffolded | Controller exists, service is stub |
| `src/modules/reminder/` | 🔲 Scaffolded | Controller exists, service is stub |
| `src/modules/monitoring/` | ❌ Not created | No files |
| `GET /dashboard/overview` | ✅ Done | Consolidated endpoint replaces 6 separate API calls |
| Dashboard expired items | ✅ Done | Domains, SSL, contracts all show expired inline with red styling |
| Docker Redis | ✅ Running | `redis:7-alpine` on port 6379 |

---

## Task Breakdown

### Phase 1: Redis + Queue Infrastructure

#### 1.1 Redis Client Module
- [ ] Create `src/redis/redis.module.ts` — Global module providing Redis/ioredis client
- [ ] Create `src/redis/redis.service.ts` — Wrapper around ioredis with health check, pub/sub helpers
- [ ] Install `ioredis` package
- [ ] Add Redis connection config to `ConfigModule` (env vars: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- [ ] Register `RedisModule` in `AppModule`
- [ ] Add Redis health check endpoint (`GET /health/redis`)

#### 1.2 BullMQ Queue Setup
- [ ] Install `@nestjs/bullmq` + `bullmq` packages
- [ ] Rewrite `src/queue/queue.module.ts` — Register BullMQ queues with Redis connection
- [ ] Rewrite `src/queue/queue.service.ts` — Helper to add/remove/delay jobs across all queues
- [ ] Define queue names constants: `domain-check`, `ssl-check`, `uptime-monitor`, `reminder-dispatch`, `contract-status`, `monthly-report`
- [ ] Add job completion/failure event listeners for logging
- [ ] Register `QueueModule` in `AppModule` with `isGlobal: true`

#### 1.3 Worker Infrastructure
- [ ] Create `src/jobs/jobs.module.ts` — Module registering all BullMQ workers/processors
- [ ] Create `src/jobs/processors/` directory
- [ ] Register `JobsModule` in `AppModule`
- [ ] Add graceful shutdown hook (close queues + workers on app shutdown)
- [ ] Add job retry configuration (default 3 retries with exponential backoff)

---

### Phase 2: Domain Tracking Engine

#### 2.1 Domain WHOIS Worker
- [ ] Create `src/jobs/processors/domain-whois-check.processor.ts`
- [ ] Job: `domain-whois-check` — Iterates all domains, calls `DomainService.triggerCheck()` for each
- [ ] Batch processing (10 domains at a time with delay between batches)
- [ ] Error isolation: one domain failure doesn't block others
- [ ] Log results: domains checked, failures, durations
- [ ] Store job metadata in Redis (last run time, duration, domains checked count)

#### 2.2 Domain Check Scheduler
- [ ] Create `src/jobs/schedulers/domain-check.scheduler.ts`
- [ ] Use `@nestjs/schedule` `Cron` decorator: run daily at 2:00 AM UTC
- [ ] On startup: queue initial domain check if no previous run in last 24h
- [ ] Expose `POST /domains/check-all` admin endpoint to trigger manually
- [ ] Expose `GET /domains/check-status` to show last run time + stats

#### 2.3 Domain Expiry Status Auto-Update
- [ ] After each WHOIS check, auto-update `domains.status` based on `expiry_date`:
  - `expired` if past
  - `expiring_soon` if within 30 days
  - `active` if > 30 days away
- [ ] Flag domains that changed status (e.g., active → expiring_soon) for notification

---

### Phase 3: SSL Tracking Engine

#### 3.1 SSL TLS Worker
- [ ] Create `src/jobs/processors/ssl-check.processor.ts`
- [ ] Job: `ssl-check` — Iterates all SSL certificates, calls `SslService.triggerCheck()` for each
- [ ] Batch processing (20 certs at a time with delay)
- [ ] Skip certificates with `valid_to` more than 90 days in the future (optional optimization)
- [ ] Error isolation per certificate
- [ ] Log results: certs checked, failures, duration

#### 3.2 SSL Check Scheduler
- [ ] Create `src/jobs/schedulers/ssl-check.scheduler.ts`
- [ ] Use `@nestjs/schedule` `Cron` decorator: run daily at 3:00 AM UTC (staggered from domain check)
- [ ] Expose `POST /ssl/check-all` admin endpoint
- [ ] Expose `GET /ssl/check-status` endpoint

#### 3.3 SSL Warning Detection
- [ ] After each check, compute warnings:
  - `self_signed` — issuer matches common_name or type is "self-signed"
  - `host_mismatch` — common_name doesn't match any SAN
  - `expired` — `valid_to` is in the past
  - `expiring_soon` — `valid_to` within 14 days
- [ ] Store warnings in `ssl_certificates.warnings` JSON column (add migration if needed)
- [ ] Expose warnings in `GET /ssl/:id` and `GET /ssl/list` responses

---

### Phase 4: Uptime Monitoring Engine

#### 4.1 Database Schema
- [ ] Create migration: `monitors` table
  - `id` UUID PK
  - `asset_id` UUID FK → assets
  - `name` VARCHAR(255)
  - `type` ENUM: `http`, `https`, `tcp`, `ping`, `keyword`
  - `url` VARCHAR(500) (for http/https)
  - `host` VARCHAR(255) (for tcp/ping)
  - `port` INTEGER (for tcp)
  - `keyword` VARCHAR(255) (for keyword check)
  - `interval_seconds` INTEGER DEFAULT 300 (1-5 min range)
  - `status` ENUM: `healthy`, `degraded`, `down`, `unknown`
  - `is_active` BOOLEAN DEFAULT true
  - `created_at`, `updated_at` TIMESTAMPTZ
- [ ] Create migration: `monitor_checks` table
  - `id` UUID PK
  - `monitor_id` UUID FK → monitors
  - `status` ENUM: `up`, `down`, `degraded`
  - `response_time_ms` INTEGER
  - `status_code` INTEGER (for http/https)
  - `error_message` TEXT
  - `checked_at` TIMESTAMPTZ
- [ ] Add `monitors` and `monitor_checks` to Kysely type generation
- [ ] Create `src/modules/monitoring/monitoring.module.ts`
- [ ] Create `src/modules/monitoring/monitoring.service.ts` — CRUD + check logic
- [ ] Create `src/modules/monitoring/monitoring.controller.ts` — REST endpoints

#### 4.2 Check Execution Logic
- [ ] HTTP/HTTPS check: `GET` request, check status code + response time
- [ ] TCP check: `net.connect()` to host:port, measure connect time
- [ ] Ping check: Use `child_process.exec('ping -c 1 -W 5 <host>')`
- [ ] Keyword check: HTTP GET + verify response body contains keyword
- [ ] Timeout: 10 seconds per check (configurable)
- [ ] Record result in `monitor_checks` table
- [ ] Update `monitors.status` based on latest check
- [ ] Store last N checks (keep 1000 per monitor, delete older)

#### 4.3 Uptime Monitor Worker
- [ ] Create `src/jobs/processors/uptime-monitor.processor.ts`
- [ ] Job: `uptime-check` — Runs all active monitors based on their `interval_seconds`
- [ ] Use BullMQ repeatable jobs: one job per monitor with custom repeat interval
- [ ] On monitor create/update: schedule or update the repeatable job
- [ ] On monitor delete/deactivate: remove the repeatable job
- [ ] Job dedup: skip if previous check for same monitor is still running

#### 4.4 Incident Auto-Creation
- [ ] After each check, evaluate consecutive failures:
  - Track consecutive `down` checks count (store in Redis: `monitor:{id}:failures`)
  - After 3 consecutive failures → auto-create `Incident` record
  - On recovery (first `up` after failures) → auto-resolve incident, reset counter
- [ ] Incident severity based on monitor type:
  - `http/https` → `high`
  - `tcp/ping` → `medium`
  - `keyword` → `low`

---

### Phase 5: Incident Module

#### 5.1 Incident Service Implementation
- [ ] Rewrite `src/modules/incident/incident.service.ts` with real logic:
  - `create(dto)` — Create incident (auto or manual)
  - `findAll(filters)` — Paginated list with status, severity, date filters
  - `findOne(id)` — Detail with timeline, related monitor checks
  - `acknowledge(id, userId)` — Set status to `acknowledged`
  - `resolve(id, userId, notes)` — Set status to `resolved`
  - `reopen(id, reason)` — Reopen resolved incident
- [ ] Add `Incident` entity type to Kysely types
- [ ] Create DTOs: `CreateIncidentDto`, `ListIncidentsDto`, `UpdateIncidentDto`

#### 5.2 Incident API Endpoints
- [ ] `GET /incidents` — List incidents (filter by status, severity, date range, monitor_id)
- [ ] `GET /incidents/:id` — Incident detail with timeline
- [ ] `POST /incidents/:id/acknowledge` — Acknowledge incident
- [ ] `POST /incidents/:id/resolve` — Resolve with notes
- [ ] `POST /incidents/:id/reopen` — Reopen with reason
- [ ] `GET /incidents/stats` — Open/acknowledged/resolved counts

---

### Phase 6: Reminder + Notification Engine

#### 6.1 Reminder Rules Schema
- [ ] Create migration: `reminder_rules` table
  - `id` UUID PK
  - `name` VARCHAR(255)
  - `event_type` ENUM: `domain_expiry`, `ssl_expiry`, `contract_expiry`, `server_renewal`
  - `days_before` INTEGER (array: [30, 14, 7, 1])
  - `channels` JSON (e.g., `["email"]`)
  - `recipients` JSON (user IDs or email addresses)
- [ ] Add to Kysely type generation
- [ ] Implement `ReminderRule` CRUD service + controller

#### 6.2 Reminder Dispatcher Worker
- [ ] Create `src/jobs/processors/reminder-dispatch.processor.ts`
- [ ] Job: `reminder-dispatch` — Runs hourly
- [ ] Logic:
  - Query all reminder rules
  - For each rule, find entities expiring within the specified `days_before` windows
  - Check if notification already sent (store in Redis: `reminder:sent:{entity_id}:{days_before}`)
  - If not sent, dispatch notification via configured channels
  - Mark as sent in Redis with TTL matching the window

#### 6.3 Email Notification Service
- [ ] Install email provider SDK (Resend / Nodemailer)
- [ ] Create `src/modules/notifications/notifications.module.ts`
- [ ] Create `src/modules/notifications/notifications.service.ts`
  - `sendEmail(to, subject, htmlBody)` — Send transactional email
  - `sendDigestEmail(userId, items)` — Aggregate notification digest
- [ ] Create email templates:
  - Domain expiry warning
  - SSL expiry warning
  - Contract renewal reminder
  - Incident alert
  - Weekly digest
- [ ] Store notification history in `notification_history` table

#### 6.4 Notification Preferences
- [ ] Add `notification_preferences` JSON column to `users` table (migration)
- [ ] Expose `GET/PATCH /users/me/notifications` endpoints
- [ ] Respect per-user channel preferences in dispatcher

---

### Phase 7: Contract Status Engine

#### 7.1 Status Auto-Transition
- [ ] Create `src/jobs/processors/contract-status.processor.ts`
- [ ] Job: `contract-status-check` — Runs daily
- [ ] Logic:
  - `active` → `expiring_soon` when `end_date` within 30 days
  - `expiring_soon` → `expired` when `end_date` is past
  - `expired` → `pending_renewal` if renewal record exists with future date
  - `pending_renewal` → `active` if renewal confirmed
- [ ] Record status transitions in `contract_renewals` table

#### 7.2 Renewal Pipeline
- [ ] Query: `GET /contracts/renewal-pipeline` — Groups contracts by renewal window (30/60/90 days)
- [ ] Include client name, contract value, assets covered
- [ ] Sort by urgency (nearest renewal first)

---

### Phase 8: Server Renewal Tracker

#### 8.1 Server Renewal Checks
- [ ] Create `src/jobs/processors/server-renewal.processor.ts`
- [ ] Job: `server-renewal-check` — Runs daily
- [ ] Flag servers where `renewal_date` is within 30 days
- [ ] Create reminder entries for upcoming server renewals

---

### Phase 9: Monthly Report Engine

#### 9.1 Uptime Report Generator
- [ ] Create `src/jobs/processors/monthly-report.processor.ts`
- [ ] Job: `monthly-report` — Runs on 1st of each month at 6:00 AM UTC
- [ ] For each client:
  - Calculate uptime % per monitored asset
  - List incidents with MTTR (mean time to resolve)
  - Summarize contract renewals
  - Domain/SSL expiry status
- [ ] Generate HTML report from template
- [ ] Store in `reports` table (or S3)
- [ ] Send via email to client account manager

---

### Phase 10: Dashboard Stats Caching

#### 10.1 Redis Cache Layer
- [ ] Cache dashboard summary data in Redis (TTL: 5 minutes)
- [ ] Cache keys: `dashboard:summary`, `dashboard:domain-stats`, `dashboard:ssl-stats`, `dashboard:expiring-contracts`
- [ ] Invalidate cache on any entity create/update/delete
- [ ] Expose `GET /dashboard/summary` with cache-first strategy

---

### Phase 11: Dashboard API Optimization

#### 11.1 Consolidated Overview Endpoint
- [x] Create `GET /dashboard/overview` — returns summary, domain stats, expiring domains/SSL/contracts, expired domains/SSL in a single response
- [x] Run all 8 data queries in parallel via `Promise.all`
- [x] Support optional `manager_id` query param for filtered critical alerts

#### 11.2 Frontend Consolidation
- [x] Replace 6 individual hooks (`useDashboardSummary`, `useExpiringDomains`, `useDomainExpiryStats`, `useExpiringContracts`, `useExpiringSsl`) with single `useDashboardOverview(managerId?)` hook
- [x] Clean up unused hook exports

#### 11.3 Expired Items Display
- [x] Add `getExpiredDomains(now)` — top 10 most recently expired domains
- [x] Add `getExpiredSslCerts(now)` — top 10 most recently expired SSL certs
- [x] Wire up `ExpiredItems` component in dashboard (was commented out)
- [x] Remove lower-bound `>= now` filter on SSL certs query — expired certs now show inline with red styling (matches domains behavior)
- [x] Remove `>= now` and `status != 'expired'` filters on contracts query — expired contracts now show inline with red styling (matches domains behavior)

---

## API Endpoints Summary

### Tracking Engine Endpoints
| Method | Endpoint | Description | Phase |
|---|---|---|---|
| `GET` | `/health/redis` | Redis health check | 1.1 |
| `POST` | `/domains/check-all` | Trigger all domain WHOIS checks | 2.2 |
| `GET` | `/domains/check-status` | Domain check last run status | 2.2 |
| `POST` | `/ssl/check-all` | Trigger all SSL TLS checks | 3.2 |
| `GET` | `/ssl/check-status` | SSL check last run status | 3.2 |
| `POST` | `/monitors` | Create monitor | 4.1 |
| `GET` | `/monitors` | List monitors | 4.1 |
| `GET` | `/monitors/:id` | Monitor detail | 4.1 |
| `PATCH` | `/monitors/:id` | Update monitor | 4.1 |
| `DELETE` | `/monitors/:id` | Delete monitor | 4.1 |
| `POST` | `/monitors/:id/check` | Manual check trigger | 4.2 |
| `GET` | `/monitors/:id/checks` | Check history | 4.2 |
| `GET` | `/incidents` | List incidents | 5.2 |
| `GET` | `/incidents/:id` | Incident detail | 5.2 |
| `POST` | `/incidents/:id/acknowledge` | Acknowledge | 5.2 |
| `POST` | `/incidents/:id/resolve` | Resolve | 5.2 |
| `POST` | `/incidents/:id/reopen` | Reopen | 5.2 |
| `GET` | `/incidents/stats` | Incident stats | 5.2 |
| `GET` | `/reminder-rules` | List rules | 6.1 |
| `POST` | `/reminder-rules` | Create rule | 6.1 |
| `PATCH` | `/reminder-rules/:id` | Update rule | 6.1 |
| `DELETE` | `/reminder-rules/:id` | Delete rule | 6.1 |
| `GET` | `/users/me/notifications` | Get preferences | 6.4 |
| `PATCH` | `/users/me/notifications` | Update preferences | 6.4 |
| `GET` | `/contracts/renewal-pipeline` | Renewal pipeline view | 7.2 |
| `GET` | `/dashboard/summary` | Cached dashboard stats | 10.1 |
| `GET` | `/dashboard/overview` | Consolidated dashboard (summary + expiring + expired) | 11.1 |

---

## Worker Schedule Summary

| Worker | Queue Name | Schedule | Phase |
|---|---|---|---|
| Domain WHOIS Check | `domain-check` | Daily 2:00 AM UTC | 2.2 |
| SSL TLS Check | `ssl-check` | Daily 3:00 AM UTC | 3.2 |
| Uptime Monitor | `uptime-monitor` | Per monitor (1-5 min) | 4.3 |
| Reminder Dispatcher | `reminder-dispatch` | Hourly | 6.2 |
| Contract Status Check | `contract-status` | Daily 4:00 AM UTC | 7.1 |
| Server Renewal Check | `server-renewal` | Daily 5:00 AM UTC | 8.1 |
| Monthly Report | `monthly-report` | 1st of month 6:00 AM UTC | 9.1 |

---

## Dependencies to Install

### Backend
```bash
# Queue + Workers
npm install @nestjs/bullmq bullmq

# Redis
npm install ioredis @nestjs-modules/ioredis

# Schedule (cron jobs)
npm install @nestjs/schedule

# Email (choose one)
npm install resend
# OR
npm install @nestjs-modules/mailer nodemailer

# Monitoring checks
# (no extra packages needed — use built-in net/tls/dns/child_process)
```

---

## Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# BullMQ
BULLMQ_PREFIX=amc

# Email (choose one)
RESEND_API_KEY=
EMAIL_FROM=notifications@amc.com

# Monitoring
MONITOR_DEFAULT_TIMEOUT=10000
MONITOR_MAX_CONSECUTIVE_FAILURES=3

# Workers
WORKER_CONCURRENCY_DOMAIN=5
WORKER_CONCURRENCY_SSL=10
WORKER_CONCURRENCY_MONITOR=20
```

---

## Migration Checklist

- [ ] `monitors` table (Phase 4.1)
- [ ] `monitor_checks` table (Phase 4.1)
- [ ] `notification_history` table (Phase 6.3)
- [ ] `reminder_rules` table (Phase 6.1)
- [ ] `users.notification_preferences` JSON column (Phase 6.4)
- [ ] `ssl_certificates.warnings` JSON column (Phase 3.3)
