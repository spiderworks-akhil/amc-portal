import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const TARGET_TYPES = ['domain', 'ssl', 'contract', 'server'] as const;
export const REMINDER_CHANNELS = ['email', 'whatsapp', 'sms', 'slack'] as const;
export const REMINDER_STATUSES = [
  'pending',
  'sent',
  'acknowledged',
  'escalated',
] as const;
export const EVENT_TYPES = [
  'domain_expiry',
  'ssl_expiry',
  'contract_expiry',
  'server_expiry',
  'incident',
] as const;

export class CreateReminderDto {
  @IsUUID()
  @IsOptional()
  rule_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsIn(TARGET_TYPES)
  @IsNotEmpty()
  target_type: string;

  @IsUUID()
  @IsNotEmpty()
  target_id: string;

  @IsDateString()
  @IsNotEmpty()
  trigger_date: string;

  @IsIn(REMINDER_CHANNELS)
  @IsNotEmpty()
  channel: string;

  @IsIn(REMINDER_STATUSES)
  @IsOptional()
  status?: string;
}
