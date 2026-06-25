# AMC Portal — Full Audit Report

> Generated: June 25, 2026  
> Scope: Full-stack audit covering frontend (Next.js), backend (NestJS), database, and infrastructure.

---

## 🚨 Critical Issues

### ~~1. TypeScript Compilation Errors~~ ✅ Fixed

**Backend** — Both errors fixed:
- ~~`src/modules/contract/contract.service.ts:43`~~ — No longer present (resolved by previous kysely-codegen regeneration).
- ~~`test/app.e2e-spec.ts:20`~~ — Changed `import * as request` to `import request` (default import with `esModuleInterop: true`).

**Impact:** Backend now compiles cleanly with zero errors.

---

### 2. Excessive `as any` Type Casting

**Location:** Multiple backend services (auth, client, asset, monitor, contract, server services)

**Examples:**
- `backend/src/modules/client/client.service.ts` — Uses `as any` on external client data, cached data, and error types in ~15 places.
- `backend/src/modules/auth/auth.service.ts` — `let decoded: any` + `as any` on JWT payload.
- `backend/src/modules/asset/asset.service.ts` — Casting JSON columns (`tech_stack`, `custom_fields`, `tags`) as `as any` throughout.
- `backend/src/modules/monitor/monitor.service.ts` — `as any` on query builder filter expressions and error types.
- `backend/src/modules/notifications/notifications.controller.ts` — `(req as any).user` to extract authenticated user.

**Impact:** Silently bypasses TypeScript safety. Runtime errors from unexpected shapes are caught only at runtime. Makes refactoring risky.

**Recommendation:** Replace with proper type assertions using Kysely's generated types. Create explicit interfaces for API responses from external services.

---

### ~~3. Console.log Statements in Production Code~~ ✅ Fixed

Both `console.log` statements removed:
- `frontend/app/(main-pages)/incidents/incidents-page-content.tsx` — Removed `console.log("console",data?.data)`
- `frontend/components/assets/asset-details/create-domain-form.tsx` — Removed `console.log("submittig")`

---

### 4. Incomplete Migration Files

**Location:**
- `backend/src/db/migrations/003_created-by-fields.ts:4` — `// TODO: write your migration`
- `backend/src/db/migrations/006_correction.ts:4` — `// TODO: write your migration`

**Impact:** These migrations have empty up/down functions. They may cause confusion or issues if the migration runner processes them.

---

## 🔧 Backend Issues

### 5. Silent Error Swallowing via Fire-and-Forget `.catch()`

**Location:** Multiple services use `.catch()` without proper error handling:

| File | Pattern |
|------|---------|
| `domain.service.ts` | `this.whatsappService.sendDomainCreated(...).catch(...)` |
| `domain.service.ts` | `this.sslService.triggerCheck(...).catch(...)` |
| `domain.service.ts` | `this.detectAndLinkRegistrar(...).catch(...)` |
| `ssl.service.ts` | `this.whatsappService.sendSslCreated(...).catch(...)` |
| `server.service.ts` | `this.whatsappService.sendServerCreated(...).catch(...)` |
| `incident-notification.service.ts` | `this.whatsappService.sendIncidentCreated(...).catch(...)` |
| `dashboard.service.ts` | `this.redis.cacheSet(...).catch(...)` (3 locations) |
| `cache-invalidation.interceptor.ts` | `this.redis.bustDashboardCache().catch(...)` |

**Impact:** Failures in WhatsApp notifications, SSL checks, registrar detection, and cache operations are silently logged but never surfaced to the user or retried. Critical operations fail silently.

**Recommendation:** For non-critical failures, at minimum log the error with context. For critical paths, consider adding the operation to a retry queue.

---

### 6. `rejectUnauthorized: false` in Production

**Location (2 places):**
- `backend/src/db/database.module.ts:25` — SSL config with `rejectUnauthorized: false`
- `backend/src/scripts/migrate.ts:41` — Same pattern

**Impact:** Disables TLS certificate verification for the database connection in production. Opens up to man-in-the-middle attacks.

**Recommendation:** Use proper CA certificates or configure `ssl: true` with proper `ca` configuration.

---

### 7. WhatsApp Service — Untyped `Record<string, unknown>`

**Location:** `whatsapp.service.ts` — All entity parameters passed as `Record<string, unknown>`
- `sendDomainCreated(domain: Record<string, unknown>)`
- `sendSslCreated(ssl: Record<string, unknown>)`
- `sendServerCreated(server: Record<string, unknown>)`
- `sendIncidentCreated(incident: Record<string, unknown>)`

**Impact:** Fields are accessed via unsafe string indexing (e.g., `entity.fqdn as string`). No compile-time safety. A field rename in the source entity type will not trigger any errors here.

**Recommendation:** Create specific interfaces (e.g., `DomainCreatedPayload`) with typed fields.

---

### ~~8. No API Rate Limiting~~ ✅ Fixed

**Changes:**
- Registered `ThrottlerGuard` as a global `APP_GUARD` in `app.module.ts` — activates the existing `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` config
- Added `@SkipThrottle()` on health controller (load balancer access)
- Added `@SkipThrottle()` on `GET /auth/me` (session validation on every page)
- Added `@SkipThrottle()` on root `GET /` (hello world)
- Sensitive auth routes already had stricter limits: `POST /auth/exchange-token` (5/min) and `POST /auth/refresh` (20/min)

---

### 9. No Server-Side Pagination Limits

**Location:** All list endpoints accept `page` and `limit` parameters but there's no upper bound enforcement on `limit`.

**Impact:** A client could request `?limit=100000` and cause excessive database load.

**Recommendation:** Enforce a maximum limit (e.g., 100) at the controller/validation layer.

---

### 10. No OpenAPI / Swagger Documentation

**Location:** Missing — no `@nestjs/swagger` setup found.

**Impact:** No auto-generated API documentation. Consumers must read source code to understand request/response shapes.

**Recommendation:** Add `@nestjs/swagger` and decorate DTOs and controllers.

---

### 11. Redis Cache — No Error Propagation

**Location:** `redis.service.ts` — Cache GET/SET/DEL errors are logged as warnings and silently return null/void.

```typescript
catch (err) {
  this.logger.warn(`Cache GET error for "${key}": ...`);
  return null;
}
```

**Impact:** Cache failures are invisible to monitoring beyond logs. The application silently falls back to database queries, potentially causing unexpected load.

---

### 12. No Request Validation on Some PATCH Endpoints

**Location:** PATCH endpoints (e.g., user update) use `@IsOptional()` on all fields, but there's no validation that at least one field is provided.

**Impact:** Clients can send empty PATCH requests that succeed without making any changes.

---

## 🎨 Frontend Issues

### 13. Hardcoded Colors in globals.css

**Location:** `frontend/app/globals.css:163-178`

```css
.success { color: #16a34a; }
.warning { color: #f59e0b; }
.danger { color: #dc2626; }
.info { color: #2563eb; }
```

**Impact:** These classes are not theme-aware — they remain the same in light and dark mode. Any component using these classes will have incorrect colors in dark mode. Should use CSS variable references instead.

---

### ~~14. Missing 404 / Error Pages~~ ✅ Fixed

**Created:**
- `frontend/app/not-found.tsx` — Branded 404 page with AMC Portal styling, card layout, and link to dashboard
- `frontend/app/error.tsx` — Branded error boundary with "Try again" and "Go to Dashboard" buttons, shows error digest when available

Both match the existing design system (enterprise blue primary, Card components, dark mode support).

---

### 15. SSE Connection — No Reconnection Strategy

**Location:** `frontend/hooks/use-in-app-notifications.ts`

The SSE connection uses `AbortController` to handle cleanup, but:
- No exponential backoff on reconnection
- No detection of stale connections (e.g., if the server silently disconnects)
- No heartbeat/ping mechanism

**Impact:** If the SSE connection drops, notifications will silently stop until the page is refreshed.

---

### 16. StaleTime May Be Too Low for Dashboard Data

**Location:** `frontend/components/providers.tsx` — `staleTime: 30_000` (30 seconds)

**Impact:** Dashboard data (which includes relatively static domain expiry stats, SSL info) is refetched every 30 seconds regardless of window focus. This generates unnecessary API calls.

**Recommendation:** Consider per-query staleTime overrides (e.g., dashboard data: 5 minutes, queue stats: 30 seconds).

---

### 17. Accessibility Gaps

While the codebase has good ARIA coverage, the following patterns lack sufficient accessibility:

- **Incident clickable rows** (`dashboard/recent-incidents-list.tsx`): Use `role="button"` and `tabIndex={0}` with keyboard handlers which is correct, but do not provide `aria-label` for context.
- **Expired items** (`dashboard/expired-items.tsx`): Similar pattern — clickable divs without `aria-label`.
- **No live regions** for dynamic updates: Toast notifications from `sonner` may not be announced by screen readers.
- **No skip-to-content link:** The layout doesn't include a skip navigation link for keyboard users.
- **Color-only status indicators:** Several components use color alone (green=up, red=down) without text labels, which is problematic for color-blind users.

---

### 18. Missing Empty States

Several list components display loading skeletons but don't have dedicated empty states when data returns with zero results:

- Dashboard widgets (expiring domains, contracts, SSL) show an icon and text but some list pages don't have explicit empty messages.
- The audit logs page shows empty table when there are no results.

---

### 19. No Data Export Functionality

No CSV, Excel, or PDF export is available for any list view (clients, domains, contracts, servers, etc.).

---

### 20. Notification Dropdown — No Pagination

**Location:** `frontend/components/notifications/notification-dropdown.tsx`

Fetches `useNotificationsList(1, 10)` — limited to 10 items with no option to load more or paginate.

**Impact:** If a user has many notifications, they can only see the most recent 10. Not a bug, but a UX limitation.

---

## 📋 Missing Features

### 21. Bulk Operations

No bulk select/delete/update functionality on any list page (clients, domains, servers, contracts, reminders, users).

### 22. Search & Filter Gaps

| Page | Full-text Search | Column-specific Filters | Sort Controls |
|------|:-:|:-:|:-:|
| Dashboard | ❌ | ❌ | ❌ |
| Clients | ✅ (name, email, company) | ❌ | ❌ |
| Domains | ✅ | ❌ | ❌ |
| SSL Certificates | ❌ | ❌ | ❌ |
| Servers | ✅ | ❌ | ❌ |
| Contracts | ✅ | ❌ | ❌ |
| Incidents | ❌ | ✅ (severity, status) | ❌ |
| Audit Logs | ❌ | ✅ (entity type, action, date) | ❌ |
| Reminders | ❌ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ |

### 23. No CI/CD Configuration

No `.github/workflows/` or similar CI configuration found. Tests and type checks must be run manually.

### 24. No Dockerfile for Frontend

A `docker-compose.yml` exists in the backend directory but no Docker setup for the frontend.

### 25. No Dark Mode Toggle

Dark mode is controlled by the presence of the `.dark` class, which is likely set based on system preference (via `prefers-color-scheme`). There's no user-facing toggle to switch between light, dark, or system modes.

### 26. No Rate Limit Feedback in UI

When the backend returns a 429 (Too Many Requests), there's no special handling in the Axios interceptor to show a meaningful error message.

---

## ✅ What's Working Well

- **Error handling:** The `AllExceptionsFilter` is comprehensive — handles validation errors, standard HTTP exceptions, and unexpected errors with environment-aware messages.
- **Auth flow:** Token refresh with queue management prevents race conditions during concurrent 401 responses.
- **UI design:** Consistent theme tokens, good use of OKLCH color space, well-designed component library with proper dark mode support.
- **Database migrations:** Well-structured migration system with up/down methods.
- **Queues:** Robust BullMQ setup with cron scheduling, retry mechanisms, and monitoring dashboard.
- **Audit logging:** Comprehensive audit trail with before/after snapshots for all entity changes.
- **Dashboard caching:** Redis caching with TTL and auto-invalidation on data changes through interceptors.
- **Type generation:** Kysely codegen keeps database types in sync with schema.

---

## 📊 Priority Matrix

| Priority | Issue | Effort |
|----------|-------|--------|
| ~~🔴 P0~~ | ~~TypeScript compilation errors~~ ✅ Fixed | — |
| ~~🔴 P0~~ | ~~Console.log in production code~~ ✅ Fixed | — |
| 🔴 P0 | Empty migration files | Low |
| 🟠 P1 | Excessive `as any` type casting | High |
| 🟠 P1 | Silent fire-and-forget error handling | Medium |
| 🟠 P1 | `rejectUnauthorized: false` in production | Low |
| 🟠 P1 | Hardcoded color classes not theme-aware | Low |
| ~~🟡 P2~~ | ~~Missing 404/error pages~~ ✅ Fixed | — |
| ~~🟡 P2~~ | ~~No API rate limiting~~ ✅ Fixed | — |
| 🟡 P2 | No Swagger/OpenAPI docs | Medium |
| 🟡 P2 | SSE reconnection strategy | Medium |
| 🟡 P2 | Accessibility gaps (skip link, live regions, color-only indicators) | Medium |
| 🟢 P3 | Missing empty states | Low |
| 🟢 P3 | No data export | Medium |
| 🟢 P3 | No dark mode toggle | Low |
| 🟢 P3 | No CI/CD | Medium |
| 🟢 P3 | No Dockerfile for frontend | Low |
| 🟢 P3 | WhatsApp service untyped payloads | Low |
| 🟢 P3 | No pagination limits enforced server-side | Low |

---

## 🔍 Summary

**Critical:** 4 issues that should be fixed immediately — compilation errors, debug console logs, empty migrations, and excessive `any` typing.

**High Priority (10 issues):** Silent error handling, production SSL config, hardcoded colors, missing error pages, no rate limiting, no API docs, SSE reconnection, accessibility, server-side pagination limits, and WhatsApp type safety.

**Nice to Have (7 issues):** Empty states, export, dark mode toggle, CI/CD, Docker, missing auth check on certain endpoints, and cache error visibility.

The codebase is well-structured overall with good patterns for error handling, auth, caching, and audit logging. The issues identified are primarily around polish, completeness, and safety rather than fundamental architectural problems.
