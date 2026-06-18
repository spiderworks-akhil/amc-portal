import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const AUDIT_ACTIONS = ['create', 'update', 'delete', 'login', 'logout', 'archive', 'restore'] as const;
const ENTITY_TYPES = ['client', 'asset', 'contract', 'domain', 'ssl', 'server', 'provider', 'monitor', 'incident', 'user'] as const;

export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  actor_id?: string;

  @IsIn(ENTITY_TYPES)
  @IsNotEmpty()
  entity_type: string;

  @IsUUID()
  @IsNotEmpty()
  entity_id: string;

  @IsIn(AUDIT_ACTIONS)
  @IsNotEmpty()
  action: string;

  @IsOptional()
  before?: Record<string, unknown>;

  @IsOptional()
  after?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(45)
  ip?: string;
}

export class ListAuditLogsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsIn([...ENTITY_TYPES, 'all'])
  @IsOptional()
  entity_type?: string;

  @IsUUID()
  @IsOptional()
  entity_id?: string;

  @IsIn([...AUDIT_ACTIONS, 'all'])
  @IsOptional()
  action?: string;

  @IsUUID()
  @IsOptional()
  actor_id?: string;

  @IsString()
  @IsOptional()
  date_from?: string;

  @IsString()
  @IsOptional()
  date_to?: string;
}
