import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { TaskDependenciesService } from './task-dependencies.service';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/tasks/:taskId/dependencies')
export class TaskDependenciesController {
  constructor(private readonly dependencies: TaskDependenciesService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskDependencyDto,
  ) {
    return this.dependencies.create(workspaceId, spaceId, listId, taskId, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.dependencies.findAll(workspaceId, spaceId, listId, taskId);
  }

  @Delete(':dependencyId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('dependencyId') dependencyId: string,
  ) {
    return this.dependencies.remove(workspaceId, spaceId, listId, taskId, dependencyId);
  }
}
