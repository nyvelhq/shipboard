import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsIn(['list', 'sprint_board'])
  type?: string;
}
