import { UUID, Timestamp } from "./common.types";

export interface AssetTypes {
  id: UUID;

  name: string;

  description: string | null;

  is_active: boolean;

  created_at: Timestamp;
}