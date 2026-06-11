import { Timestamp, UUID } from "./common.types";

export interface ClientAccountManagers {
  id:  UUID;
  client_id: string;
  manager_id: string;
  deleted_at: Timestamp | null;
 
   created_at: Timestamp;
 
   updated_at: Timestamp;
}
