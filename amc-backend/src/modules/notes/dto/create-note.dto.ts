import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  noteable_type: string;

  @IsUUID()
  @IsNotEmpty()
  noteable_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
