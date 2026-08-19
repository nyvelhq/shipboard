import { IsString, MinLength } from 'class-validator';

export class CreateAcceptanceCriterionDto {
  @IsString()
  @MinLength(1)
  text!: string;
}
