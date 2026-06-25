import { UUID, Timestamp, Json } from "./common.types";
import { AuditAction } from "./enums";

export interface AuditLogs {
  id: UUID;

  actor_id: string | null;

  entity_type: string;

  entity_id: string;

  action: AuditAction;

  before: Json | null;

  after: Json | null;

  ip: string | null;

  created_at: Timestamp;
}