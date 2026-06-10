

import { UUID, Timestamp } from "./common.types";

export interface SslSnapshots {
  id: UUID;

  ssl_id: string;

  issuer: string | null;

  valid_from: Timestamp | null;

  valid_to: Timestamp | null;

  checked_at: Timestamp;
}