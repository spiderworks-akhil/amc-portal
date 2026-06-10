import { UUID, Timestamp } from "./common.types";
import { SslType } from "./enums";

export interface SslCertificates {
  id: UUID;

  domain_id: string;

  asset_id: string | null;

  issuer: string | null;

  common_name: string | null;

  sans: string[];

  valid_from: Timestamp | null;

  valid_to: Timestamp | null;

  type: SslType | null;

  last_checked_at: Timestamp | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}