import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { InvitesService } from './invites.service';

// Separate from InvitesController on purpose: these routes aren't nested
// under a workspaceId, and the visitor isn't a workspace member yet — the
// whole point of an invite is to grant that membership, so it can't sit
// behind WorkspaceMembershipGuard.
@Controller('invites')
export class InviteAcceptController {
  constructor(private readonly invites: InvitesService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.invites.getByToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':token/accept')
  accept(@Param('token') token: string, @CurrentUser() user: RequestUser) {
    return this.invites.accept(token, user.id, user.email);
  }
}
