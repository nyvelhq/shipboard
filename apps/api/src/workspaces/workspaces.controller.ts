import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ELEVATED_ROLES } from '../common/roles';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: RequestUser) {
    return this.workspaces.findMine(user.id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @Get(':workspaceId')
  findOne(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.findOne(workspaceId);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @Get(':workspaceId/members')
  listMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.listMembers(workspaceId);
  }

  @UseGuards(WorkspaceMembershipGuard, RolesGuard)
  @Roles(...ELEVATED_ROLES)
  @Post(':workspaceId/members')
  addMember(@Param('workspaceId') workspaceId: string, @Body() dto: AddMemberDto) {
    return this.workspaces.addMember(workspaceId, dto);
  }

  @UseGuards(WorkspaceMembershipGuard, RolesGuard)
  @Roles(...ELEVATED_ROLES)
  @Delete(':workspaceId/members/:userId')
  removeMember(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string) {
    return this.workspaces.removeMember(workspaceId, userId);
  }
}
