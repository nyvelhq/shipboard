import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ELEVATED_ROLES } from '../common/roles';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard, RolesGuard)
@Roles(...ELEVATED_ROLES)
@Controller('workspaces/:workspaceId/invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invites.create(workspaceId, user.id, dto);
  }

  @Get()
  listPending(@Param('workspaceId') workspaceId: string) {
    return this.invites.listPending(workspaceId);
  }

  @Delete(':inviteId')
  revoke(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string) {
    return this.invites.revoke(workspaceId, inviteId);
  }
}
