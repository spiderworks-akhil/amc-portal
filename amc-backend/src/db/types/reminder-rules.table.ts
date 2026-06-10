import { UUID, Timestamp, Json } from "./common.types";

export interface ReminderRules {
  id: UUID;

  name: string;

  event_type: string;

  trigger_days: number[];

  channels: string[];

  recipients: Json | null;

  enabled: boolean;

  created_at: Timestamp;

  updated_at: Timestamp;
}