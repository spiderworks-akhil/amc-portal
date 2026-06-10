import { UUID, Timestamp } from "./common.types";
import {
  MonitorType,
  MonitorStatus,
} from "./enums";

export interface Monitors {
  id: UUID;

  asset_id: string;

  name: string;

  check_type: MonitorType;

  target: string;

  interval_seconds: number;

  expected_status_code: number | null;

  expected_keyword: string | null;

  current_status: MonitorStatus;

  enabled: boolean;

  last_checked_at: Timestamp | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}