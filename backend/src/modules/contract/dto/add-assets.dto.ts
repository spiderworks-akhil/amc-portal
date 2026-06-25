import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

export class AssetIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  asset_ids: string[];
}
