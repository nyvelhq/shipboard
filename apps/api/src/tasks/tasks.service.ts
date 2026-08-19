import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const TASK_INCLUDE = {
  status: true,
  sprint: true,
  creator: { select: { id: true, name: true, email: true } },
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  customFieldValues: { include: { customField: true } },
  tags: { include: { tag: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lists: ListsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(workspaceId: string, spaceId: string, listId: string, userId: string, dto: CreateTaskDto) {
    const list = await this.lists.findOne(workspaceId, spaceId, listId);
    const statusId = dto.statusId ?? list.statuses[0]?.id;
    if (!statusId) throw new BadRequestException('List has no statuses configured.');
    await this.assertStatusBelongsToList(statusId, listId);
    if (dto.assigneeIds?.length) await this.assertAssigneesAreMembers(workspaceId, dto.assigneeIds);

    const position = await this.prisma.task.count({ where: { listId, parentTaskId: null } });

    const task = await this.prisma.task.create({
      data: {
        listId,
        statusId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 'normal',
        storyPoints: dto.storyPoints,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        position,
        createdBy: userId,
        assignees: dto.assigneeIds?.length
          ? { create: dto.assigneeIds.map((assigneeId) => ({ userId: assigneeId })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return task;
  }

  async createSubtask(
    workspaceId: string,
    spaceId: string,
    listId: string,
    parentTaskId: string,
    userId: string,
    dto: CreateTaskDto,
  ) {
    const parent = await this.findOne(workspaceId, spaceId, listId, parentTaskId);
    if (parent.parentTaskId) {
      throw new BadRequestException('Subtasks cannot have their own subtasks.');
    }

    const statusId = dto.statusId ?? parent.statusId;
    await this.assertStatusBelongsToList(statusId, listId);
    if (dto.assigneeIds?.length) await this.assertAssigneesAreMembers(workspaceId, dto.assigneeIds);

    const position = await this.prisma.task.count({ where: { parentTaskId } });

    const subtask = await this.prisma.task.create({
      data: {
        listId,
        parentTaskId,
        statusId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 'normal',
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        position,
        createdBy: userId,
        assignees: dto.assigneeIds?.length
          ? { create: dto.assigneeIds.map((assigneeId) => ({ userId: assigneeId })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return subtask;
  }

  async findAll(workspaceId: string, spaceId: string, listId: string) {
    await this.lists.findOne(workspaceId, spaceId, listId);
    return this.prisma.task.findMany({
      where: { listId, parentTaskId: null },
      orderBy: { position: 'asc' },
      include: {
        ...TASK_INCLUDE,
        subtasks: { orderBy: { position: 'asc' }, include: TASK_INCLUDE },
      },
    });
  }

  async findOne(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.lists.findOne(workspaceId, spaceId, listId);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { ...TASK_INCLUDE, subtasks: { orderBy: { position: 'asc' }, include: TASK_INCLUDE } },
    });
    if (!task || task.listId !== listId) {
      throw new NotFoundException('Task not found.');
    }
    return task;
  }

  async update(workspaceId: string, spaceId: string, listId: string, taskId: string, dto: UpdateTaskDto) {
    await this.findOne(workspaceId, spaceId, listId, taskId);
    if (dto.statusId) await this.assertStatusBelongsToList(dto.statusId, listId);
    if (dto.assigneeIds) await this.assertAssigneesAreMembers(workspaceId, dto.assigneeIds);
    if (dto.tagIds) await this.assertTagsInWorkspace(workspaceId, dto.tagIds);
    if (dto.sprintId) await this.assertSprintBelongsToList(dto.sprintId, listId);
    if (dto.customFieldValues) {
      await this.assertCustomFieldsApplicable(workspaceId, spaceId, listId, Object.keys(dto.customFieldValues));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.assigneeIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (dto.assigneeIds.length) {
          await tx.taskAssignee.createMany({
            data: dto.assigneeIds.map((assigneeId) => ({ taskId, userId: assigneeId })),
          });
        }
      }
      if (dto.tagIds) {
        await tx.taskTag.deleteMany({ where: { taskId } });
        if (dto.tagIds.length) {
          await tx.taskTag.createMany({
            data: dto.tagIds.map((tagId) => ({ taskId, tagId })),
          });
        }
      }
      if (dto.customFieldValues) {
        for (const [customFieldId, value] of Object.entries(dto.customFieldValues)) {
          // eslint-disable-next-line no-await-in-loop
          await tx.customFieldValue.upsert({
            where: { taskId_customFieldId: { taskId, customFieldId } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            update: { value: value as any },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: { taskId, customFieldId, value: value as any },
          });
        }
      }
      return tx.task.update({
        where: { id: taskId },
        data: {
          name: dto.name,
          description: dto.description,
          statusId: dto.statusId,
          priority: dto.priority,
          sprintId: dto.sprintId, // string assigns, null clears (backlog), undefined leaves unchanged
          storyPoints: dto.storyPoints,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
        include: TASK_INCLUDE,
      });
    });
    this.realtime.emitListChanged(listId);
    return updated;
  }

  async remove(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    const task = await this.findOne(workspaceId, spaceId, listId, taskId);
    const idsToClear = [taskId, ...task.subtasks.map((s) => s.id)];

    await this.prisma.$transaction([
      this.prisma.taskAssignee.deleteMany({ where: { taskId: { in: idsToClear } } }),
      this.prisma.task.deleteMany({ where: { parentTaskId: taskId } }),
      this.prisma.task.delete({ where: { id: taskId } }),
    ]);
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }

  private async assertStatusBelongsToList(statusId: string, listId: string) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status || status.listId !== listId) {
      throw new BadRequestException('Status does not belong to this List.');
    }
  }

  private async assertSprintBelongsToList(sprintId: string, listId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.listId !== listId) {
      throw new BadRequestException('Sprint does not belong to this List.');
    }
  }

  private async assertAssigneesAreMembers(workspaceId: string, userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds));
    const count = await this.prisma.workspaceMember.count({
      where: { workspaceId, userId: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('All assignees must be members of this workspace.');
    }
  }

  private async assertTagsInWorkspace(workspaceId: string, tagIds: string[]) {
    const uniqueIds = Array.from(new Set(tagIds));
    const count = await this.prisma.tag.count({
      where: { workspaceId, id: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more tags do not belong to this workspace.');
    }
  }

  private async assertCustomFieldsApplicable(
    workspaceId: string,
    spaceId: string,
    listId: string,
    fieldIds: string[],
  ) {
    const fields = await this.prisma.customField.findMany({ where: { id: { in: fieldIds } } });
    if (fields.length !== fieldIds.length) {
      throw new BadRequestException('One or more custom fields do not exist.');
    }
    const inScope = fields.every(
      (f) =>
        f.workspaceId === workspaceId &&
        (f.listId === listId || (f.listId === null && (f.spaceId === spaceId || f.spaceId === null))),
    );
    if (!inScope) {
      throw new BadRequestException('One or more custom fields are not visible on this List.');
    }
  }
}
