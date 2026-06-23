import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
