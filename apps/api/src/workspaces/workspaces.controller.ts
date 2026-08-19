import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

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
}
