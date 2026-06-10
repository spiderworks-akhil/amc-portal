import { UUID, Timestamp } from "./common.types";

export interface AssetTypes {
  id: UUID;

  name: string;

  description: string | null;

  created_at: Timestamp;
}