# Reminder Module — Task List

## Database Schema (already exists)

Tables: `reminder_rules`, `reminders`, `notification_history`

### `reminder_rules`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(255) | Rule name |
| event_type | varchar(50) | domain_expiry / ssl_expiry / contract_expiry / server_expiry / incident |
| trigger_days | jsonb | Days before expiry to trigger (e.g. [30, 14, 7, 1]) |
| channels | jsonb | ["email"] v1, ["email","slack","whatsapp","sms"] future |
| recipients | jsonb | nullable — override recipients per rule |
| enabled | boolean | default true |

### `reminders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| rule_id | uuid | FK → reminder_rules (nullable on delete set null) |
| title | varchar(255) | |
| message | text | nullable |
| target_type | varchar(50) | domain / ssl / contract / server |
| target_id | uuid | FK to the target entity |
| trigger_date | timestamptz | When to send |
| channel | varchar(20) | email / whatsapp / sms / slack |
| status | varchar(20) | pending / sent / acknowledged / escalated |
| sent_at | timestamptz | nullable |
| acknowledged_at | timestamptz | nullable |

### `notification_history`
| Column | Notes |
|--------|-------|
| reminder_id | FK → reminders (CASCADE) |
| recipient, channel, status, provider_message_id, sent_at, delivered_at, failed_at | Delivery tracking |

## Backend Tasks

### 1. Fix reminder controller — `+id` → `ParseUUIDPipe`
- **File:** `src/modules/reminder/reminder.controller.ts`
- Replace numeric coercion `+id` with `@Param('id', ParseUUIDPipe) id: string`
- Fix `findOne`, `update`, `remove`

### 2. Implement DTOs
- **File:** `src/modules/reminder/dto/create-reminder.dto.ts`
- Add validation decorators: title (required), message, target_type (required, enum), target_id (required, UUID), trigger_date (required, ISO date), channel (required, enum), status
- **File:** `src/modules/reminder/dto/update-reminder.dto.ts`
- PartialType of CreateReminderDto

### 3. Create reminder-rules DTOs
- **New files:** `dto/create-reminder-rule.dto.ts`, `dto/update-reminder-rule.dto.ts`
- Fields: name (required), event_type (required, enum), trigger_days (required, array of numbers), channels (required, array), recipients (optional), enabled (optional)

### 4. Create reminder-rules controller + service
- **New controller:** `reminder-rules.controller.ts` — CRUD at `/reminder-rules`
- **New service:** `reminder-rules.service.ts` — DB queries via Kysely
- Register in `reminder.module.ts`

### 5. Implement reminder service (real CRUD)
- **File:** `src/modules/reminder/reminder.service.ts`
- Replace stubs with real Kysely DB queries
- `create(dto)` → INSERT into `reminders`
- `findAll()` → SELECT with pagination, optional filters (status, target_type, date range)
- `findOne(id)` → SELECT by id
- `update(id, dto)` → UPDATE
- `remove(id)` → DELETE
- **New method:** `findUpcoming(days: number)` → SELECT where trigger_date BETWEEN now AND now + days AND status = 'pending'

### 6. Implement reminder-rules service
- CRUD for `reminder_rules` table
- `findActiveByEventType(eventType)` → SELECT enabled rules for a given event type
- `getEffectiveRecipients(rule, targetEntity)` → merge rule recipients with entity's default contacts

### 7. Build reminder dispatcher (cron job)
- **New file:** `src/modules/reminder/reminder-dispatcher.service.ts` or use existing scheduled task setup
- On a schedule (hourly or daily):
  1. Query all enabled `reminder_rules`
  2. For each rule, query target entities (domains, SSL, contracts, servers) expiring within `trigger_days`
  3. Check if a `reminders` record already exists for this combination (target_type + target_id + rule_id + trigger_date) to avoid duplicates
  4. Create `reminders` records with status `pending`
  5. Attempt to send via email (v1) / other channels (future)
  6. On send success → update status to `sent`, write `notification_history`
  7. On send failure → log error, optionally escalate

### 8. Integration queries for dispatcher
- For **domain expiry**: join `domains` table, check `expiry_date` against `trigger_days`
- For **SSL expiry**: join `ssl_certificates` table, check `expiry_date`
- For **contract expiry**: join `contracts`, check `end_date`
- For **server expiry**: join `servers`, check `renewal_date`
- For **incidents**: join `incidents`, check `resolved_at` or `acknowledged_at` thresholds

### 9. Acknowledge / escalate endpoint
- `POST /reminder/:id/acknowledge` → set status = 'acknowledged', set acknowledged_at
- `POST /reminder/:id/escalate` → set status = 'escalated', optionally notify additional contacts

## Frontend Tasks

### 10. API types
- **File:** `amc-frontend/types/api.ts`
- Add `Reminder` interface
- Add `ReminderRule` interface
- Add `ReminderStatus`, `ReminderChannel`, `EventType` types
- Add API response types for paginated reminder lists

### 11. Hooks
- **New file:** `hooks/use-reminders.ts`
  - `useReminders(params?)` — paginated list with filters
  - `useReminder(id)` — single reminder detail
  - `useAcknowledgeReminder()` — mutation
  - `useCreateReminder()` — mutation
  - `useUpdateReminder()` — mutation
  - `useDeleteReminder()` — mutation
- **New file:** `hooks/use-reminder-rules.ts`
  - `useReminderRules()` — list all rules
  - `useCreateReminderRule()` — mutation
  - `useUpdateReminderRule()` — mutation
  - `useDeleteReminderRule()` — mutation

### 12. Reminders list page
- **Route:** `/reminders` (main-pages)
- Table view with columns: title, target type, target, trigger date, channel, status, sent at, acknowledged at
- Filters: status, target type, date range
- Pagination (same pattern as monitors/incidents)
- Click row → open detail drawer

### 13. Reminder detail drawer
- Show full reminder info
- Acknowledge button (if status = sent/pending)
- Link to target entity (domain/SSL/contract/server detail page)
- Notification history timeline

### 14. Reminder rules page/section
- Manage reminder rules (CRUD)
- For each event type, configure trigger days, channels, enabled/disabled
- Could be a section in settings or a standalone page

### 15. Reminder rule form
- Name input
- Event type selector (domain_expiry, ssl_expiry, etc.)
- Trigger days: multi-input for days (e.g. 30, 14, 7, 1)
- Channels: multi-select (email v1, others later)
- Recipients override (optional)
- Enabled toggle

### 16. Integrate reminders into detail pages
- **Domain detail page:** Show upcoming reminders for this domain
- **SSL detail page:** Show upcoming reminders
- **Contract detail page:** Show upcoming reminders  
- **Server detail page:** Show upcoming reminders
- Each detail page should have a "reminders" section or inline indicator

### 17. Navigation
- Add "Reminders" link to sidebar navigation
- Badge with count of pending reminders (optional, v2)

## Notification Delivery

### 18. Email notification service
- **If exists:** integrate with existing email/notification module
- **If not:** create email sender (Nodemailer / SendGrid / AWS SES)
- Send reminder emails with:
  - Subject: "[Reminder] {title}"
  - Body: message + entity details + link to acknowledge
- Track delivery in `notification_history`

### 19. Escalation logic
- If a reminder is not acknowledged within N hours/days → escalate
- Escalation: send to additional recipients (manager, admin)
- Configurable per event type or per rule

## Phasing

### Phase 1 (MVP)
- Tasks 1, 2, 3, 4, 5, 6 — Backend CRUD
- Tasks 10, 11, 12, 13 — Frontend list + detail
- Tasks 7, 8 — Dispatcher (email-only)
- Task 18 — Email sending
- Task 17 — Navigation link

### Phase 2
- Tasks 14, 15 — Reminder rules UI
- Task 16 — Detail page integration
- Task 9 — Acknowledge/escalate
- Task 19 — Escalation logic

### Phase 3
- Additional channels (Slack, WhatsApp, SMS)
- Dashboard widget for upcoming reminders
- Bulk acknowledge
- Reminder analytics (sent rate, ack rate)
