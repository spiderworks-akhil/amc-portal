import { UUID, Timestamp, Json } from "./common.types";
import { AssetStatus, AssetType } from "./enums";

export interface Assets {
  id: UUID;

  client_id: string;

  type: AssetType;

  name: string;

  primary_url: string | null;

  status: AssetStatus;

  primary_contact_name: string | null;

  primary_contact_email: string | null;

  monitoring_enabled: boolean;

  tech_stack: Json | null;

  custom_fields: Json | null;

  tags: string[];

  notes: string | null;

  deleted_at: Timestamp | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}