import { UUID, Timestamp, Json } from "./common.types";
import { UserRole, UserStatus } from "./enums";

export interface Users {
  id: UUID;

  name: string;

  email: string;

  password_hash: string | null;
  avatar_url: string | null;
  remote_user_id: bigint | null;
  role: UserRole;

  is_active: boolean;
  
  last_login_at: Timestamp | null;

  notification_prefs: Json | null;

  created_at: Timestamp;

  updated_at: Timestamp;
}