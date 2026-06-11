import { UUID, Timestamp } from "./common.types";

export interface Tags {
  id: UUID;

  name: string;

  created_at: Timestamp;
}
