import { Timestamp } from "./common.types";

export interface RevokedTokens {
  jti: string;
  user_id: string;
  expires_at: Timestamp;
  created_at: Timestamp;
}
