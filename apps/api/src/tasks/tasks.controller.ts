import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(workspaceId, spaceId, listId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
  ) {
    return this.tasks.findAll(workspaceId, spaceId, listId);
  }

  @Get(':taskId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.findOne(workspaceId, spaceId, listId, taskId);
  }

  @Patch(':taskId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(workspaceId, spaceId, listId, taskId, dto);
  }

  @Delete(':taskId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.remove(workspaceId, spaceId, listId, taskId);
  }

  @Post(':taskId/subtasks')
  createSubtask(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.createSubtask(workspaceId, spaceId, listId, taskId, user.id, dto);
  }
}
