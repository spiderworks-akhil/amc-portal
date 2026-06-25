import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log_config';

export interface AuditLogConfig {
  /** The logical entity type to record in audit_logs.entity_type */
  entityType: string;
  /** The route parameter name that holds the entity ID (default: 'id') */
  idParam?: string;
}

/**
 * Marks a controller handler for automatic audit logging.
 *
 * Usage:
 *   @AuditLog({ entityType: 'client' })
 *   @AuditLog({ entityType: 'client', idParam: 'contactId' })
 */
export const AuditLog = (config: AuditLogConfig) => SetMetadata(AUDIT_LOG_KEY, config);
