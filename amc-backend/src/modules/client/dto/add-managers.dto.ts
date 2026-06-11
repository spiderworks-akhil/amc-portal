import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export class AddManagersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  manager_ids: string[];
  @IsUUID()
  @IsNotEmpty()
  client_id: string;

}

export class RemoveManagersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  manager_ids: string[];
  @IsUUID()
  @IsNotEmpty()
  client_id: string;
}
