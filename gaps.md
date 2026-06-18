# AMC Portal — Gaps Analysis

## Critical Gaps (blocking user workflows)

| Gap | Backend | Frontend | Notes |
|---|---|---|---|

| **Contracts create/edit** | ✅ Full CRUD | ❌ No create or edit form in UI | List + detail pages exist |
| **Monitors frontend** | ✅ Full CRUD + checks | ⚠️ Pages exist but need verification | May be placeholder stubs |
| **Domain create form** | ✅ POST /domains | ❌ No "Add Domain" UI | Only accessible via asset detail |
| **Incidents module** | ⚠️ Scaffolded (stub service, `+id` bug) | ❌ No pages | Uses string→number coercion for UUIDs |
| **Audit Log module** | ⚠️ Scaffolded (stub service, `+id` bug) | ❌ No pages | Same UUID bug |
| **Reminder module** | ⚠️ Scaffolded (stub service, `+id` bug) | ❌ No pages | Same UUID bug |

## Infrastructure Gaps

| Gap | Details |
|---|---|
| **No cron scheduler** | `@nestjs/schedule` not installed. BullMQ queues are registered but no automated cron triggers exist for domain/SSL refresh or expiry notifications |
| **No notification service** | Nodemailer in package.json but no email/SMS service implemented. No notification delivery for expiring domains, SSL, contracts, or monitor incidents |
| **No caching layer** | Redis is connected (used by BullMQ) but no caching implemented for expensive queries (dashboard, expiry stats) |
| **No health endpoint** | `/health` endpoint with Redis/DB connectivity check missing |
| **No reports module** | No Excel/PDF report generation for clients, domains, SSL, or financial summaries |
| **No client portal** | No external-facing route group for clients to view their own assets/domains/SSL |
| **No CSV import/export** | No bulk operations for clients, assets, domains, etc. |
| **No RBAC enforcement** | Roles exist in `users` table and JWT payload but no guard checks restrict routes by role |
| **No API documentation** | `@nestjs/swagger` not installed — no OpenAPI/Swagger UI |

## UI/UX Gaps

| Gap | Details |
|---|---|
| **Bulk actions missing** | No select-and-perform-action patterns on list pages (e.g., bulk delete domains, bulk trigger SSL checks) |
| **No filtering on all columns** | Some list pages have limited filter options (e.g., SSL list only filters by type/domain) |
| **No pagination on detail sub-tables** | Snapshots, checks history, renewals lists on detail pages are all unfetched (latest 10 only) |
| **No export to PDF/CSV** | No data export on any list page |
| **No dark mode** | No theme toggle despite Tailwind v4 + shadcn/ui supporting it |
| **No keyboard shortcuts** | No power-user accelerators |
| **Responsive gaps** | Some complex tables may overflow on mobile (not verified) |

## Tech Debt / Code Quality

| Issue | Location | Severity |
|---|---|---|
| `+id` coercion instead of `ParseUUIDPipe` | `incident.controller.ts`, `audit-log.controller.ts`, `reminder.controller.ts` | High (would fail on UUIDs) |
| `console.log` left in production code | `smooth-select.tsx:43` | Low |
| TypeScript error | `calendar.tsx:181` | Medium |
| No pre-commit hooks | Project root | Low |
| No CI/CD configuration | Project root | Medium |
| No Docker Compose for PostgreSQL | Only Redis is dockerized | Low |

## Module Cross-Reference

| Module | Backend CRUD | Backend Real | Frontend List | Frontend Detail | Frontend Create/Edit |
|---|---|---|---|---|---|
| Clients | ✅ Full | ✅ | ✅ | ✅ | ✅ |
| Assets | ✅ Full | ✅ | ✅ | ✅ | ✅ |
| Contracts | ✅ Full | ✅ | ✅ | ✅ | ❌ |
| Servers | ✅ Full | ✅ | ✅ | ✅ | ✅ |
| Domains | ✅ Full | ✅ | ✅ | ✅ | ⚠️ (via asset only) |
| SSL | ✅ Full | ✅ | ✅ | ✅ | ⚠️ (via domain detail) |
| Monitors | ✅ Full | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Dashboard | N/A | ✅ | ✅ | N/A | N/A |
| Auth | Partial | ✅ | N/A | N/A | N/A |
| Users | Read-only | ✅ | ❌ | ❌ | ❌ |
| Incidents | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ |
| Reminders | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ |
| Reports | ❌ | ❌ | ❌ | ❌ | ❌ |
| Client Portal | ❌ | ❌ | ❌ | ❌ | ❌ |
| CSV Import | ❌ | ❌ | ❌ | ❌ | ❌ |

## Recommendation Priority

### P0 — Must fix
1. Fix UUID coercion bug in Incident/AuditLog/Reminder controllers (`+id` → `ParseUUIDPipe`)
2. Implement Providers frontend pages (list + detail + create/edit)
3. Build Contracts create/edit form

### P1 — Should build
4. Complete Monitors frontend (list + detail + create/edit drawers)
5. Build Incident management UI (list incidents by monitor, acknowledge/resolve)
6. Add cron scheduler for automated domain/SSL refresh jobs
7. Implement notification service (email for expiring domains, SSL, contracts)

### P2 — Nice to have
8. Build Reports module (PDF export for client summaries, domain expiry reports)
9. Client portal route group with scoped data access
10. CSV import/export for all entities
11. RBAC guard implementation
12. Swagger/OpenAPI documentation
13. Redis caching layer for dashboard stats
14. Health check endpoint
15. Dark mode toggle
16. Bulk actions on list pages
17. CI/CD pipeline
18. Pre-commit hooks
