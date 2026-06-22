import { Injectable, Logger } from '@nestjs/common';

/**
 * Reminder dispatcher has been split into two BullMQ processors:
 * - reminder-creation.processor.ts — runs every 6 hours, creates pending reminders from rules
 * - reminder-sending.processor.ts — runs every minute, sends due reminders with retry/backoff
 *
 * This file is kept as a shell to avoid breaking imports. All logic has moved.
 */
@Injectable()
export class ReminderDispatcherService {
  private readonly logger = new Logger(ReminderDispatcherService.name);
}
