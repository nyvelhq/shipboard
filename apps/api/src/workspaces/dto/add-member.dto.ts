import { IsEmail, IsIn } from 'class-validator';

// 'owner' is deliberately not assignable here — transferring/sharing
// ownership is a bigger decision than adding a member, and isn't what
// this endpoint is for.
export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['admin', 'member', 'guest'])
  role!: string;
}
