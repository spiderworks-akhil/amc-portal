import { UUID, Timestamp } from "./common.types";
import { ProviderType } from "./enums";

export interface ServiceProviders {
  id: UUID;

  name: string;

  type: ProviderType;

  website: string | null;

  notes: string | null;

  created_by_id: string | null;

  updated_by_id: string | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}