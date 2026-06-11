import { UUID, Timestamp } from "./common.types";

export interface ClientContacts {
  id: UUID;

  client_id: string;

  name: string;

  designation: string | null;

  email: string | null;

  phone: string | null;

  is_primary: boolean;

  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string | null;
  updated_by: string | null;
}