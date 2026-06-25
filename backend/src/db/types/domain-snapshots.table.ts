import { UUID, Timestamp } from "./common.types";

export interface DomainSnapshots {
  id: UUID;

  domain_id: string;

  registrar: string | null;

  expiry_date: Timestamp | null;

  nameservers: string[];

  checked_at: Timestamp;
}