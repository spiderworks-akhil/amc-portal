import { UUID, Timestamp } from "./common.types";

export interface Servers {
  id: UUID;

  provider_id: string;

  label: string;

  ip_addresses: string[];

  region: string | null;

  operating_system: string | null;

  panel_url: string | null;

  monthly_cost: string | null;

  currency: string;

  renewal_date: Timestamp | null;

  notes: string | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}