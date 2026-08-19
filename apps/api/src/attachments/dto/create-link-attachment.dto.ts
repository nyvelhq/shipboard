import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateLinkAttachmentDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;
}
