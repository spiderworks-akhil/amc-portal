import { UUID, Timestamp } from "./common.types";
import { BillingCycle, ContractStatus } from "./enums";

export interface Contracts {
  id: UUID;

  client_id: string;

  contract_number: string | null;

  billing_cycle: BillingCycle;

  start_date: Timestamp;

  end_date: Timestamp;

  renewal_date: Timestamp;

  amount: string | null;

  currency: string;

  auto_renew: boolean;

  scope: string | null;

  status: ContractStatus;

  deleted_at: Timestamp | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}