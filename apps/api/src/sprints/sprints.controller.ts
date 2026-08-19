import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ELEVATED_ROLES } from '../common/roles';
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/sprints')
export class SprintsController {
  constructor(private readonly sprints: SprintsService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Body() dto: CreateSprintDto,
  ) {
    return this.sprints.create(workspaceId, spaceId, listId, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
  ) {
    return this.sprints.findAll(workspaceId, spaceId, listId);
  }

  @Get(':sprintId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('sprintId') sprintId: string,
  ) {
    return this.sprints.findOne(workspaceId, spaceId, listId, sprintId);
  }

  @Patch(':sprintId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.sprints.update(workspaceId, spaceId, listId, sprintId, dto);
  }

  @Delete(':sprintId')
  @UseGuards(RolesGuard)
  @Roles(...ELEVATED_ROLES)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('sprintId') sprintId: string,
  ) {
    return this.sprints.remove(workspaceId, spaceId, listId, sprintId);
  }
}
