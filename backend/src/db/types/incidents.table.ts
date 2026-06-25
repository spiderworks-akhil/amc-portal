import { UUID, Timestamp } from "./common.types";
import { Severity } from "./enums";

export interface Incidents {
  id: UUID;

  monitor_id: string;

  started_at: Timestamp;

  resolved_at: Timestamp | null;

  duration_seconds: number | null;

  cause: string | null;

  severity: Severity;

  acknowledged_by: string | null;

  notes: string | null;

  created_at: Timestamp;
}