import { UUID, Timestamp } from "./common.types";

export interface ContractRenewals {
  id: UUID;

  contract_id: string;

  renewed_at: Timestamp;

  previous_end_date: Timestamp | null;

  new_start_date: Timestamp | null;

  new_end_date: Timestamp | null;

  amount: string | null;

  notes: string | null;

  created_at: Timestamp;
}