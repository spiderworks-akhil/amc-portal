import { UUID, Timestamp } from "./common.types";
import { MonitorStatus } from "./enums";

export interface MonitorChecks {
  id: UUID;

  monitor_id: string;

  status_code: number | null;

  response_time_ms: number | null;

  error_message: string | null;

  status: MonitorStatus;

  checked_at: Timestamp;
}