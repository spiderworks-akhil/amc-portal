import { IsArray, IsUUID, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class LinkScopesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  scope_ids: string[];
}
