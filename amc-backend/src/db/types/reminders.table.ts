import { UUID, Timestamp } from "./common.types";
import {
  ReminderChannel,
  ReminderStatus,
} from "./enums";

export interface Reminders {
  id: UUID;

  rule_id: string | null;

  title: string;

  message: string | null;

  target_type: string;

  target_id: string;

  trigger_date: Timestamp;

  channel: ReminderChannel;

  status: ReminderStatus;

  sent_at: Timestamp | null;

  acknowledged_at: Timestamp | null;

  created_at: Timestamp;
}