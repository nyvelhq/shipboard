import { IsEmail, IsIn } from 'class-validator';

// 'owner' is deliberately not assignable here, same reasoning as
// AddMemberDto — transferring ownership isn't what this endpoint is for.
export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsIn(['admin', 'member', 'guest'])
  role!: string;
}
