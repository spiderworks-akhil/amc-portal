import { UUID, Timestamp } from "./common.types";

export interface Domains {
  id: UUID;

  asset_id: string;

  fqdn: string;

  registrar_id: string | null;

  registered_date: Timestamp | null;

  expiry_date: Timestamp | null;

  auto_renew: boolean;

  nameservers: string[];

  notes: string | null;

  last_checked_at: Timestamp | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}