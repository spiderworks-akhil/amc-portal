import { UUID, Timestamp, Json } from "./common.types";

export interface Clients {
  id: UUID;

  name: string;

  company: string | null;

  email: string | null;

  phone: string | null;

  address: string | null;

  is_active: boolean;

  tags: string[];

  custom_fields: Json | null;

  account_manager_id: string | null;

  notes: string | null;

  deleted_at: Timestamp | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}