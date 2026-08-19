import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

const TASK_SUMMARY_INCLUDE = {
  status: true,
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
} as const;

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lists: ListsService,
  ) {}

  async create(workspaceId: string, spaceId: string, listId: string, dto: CreateSprintDto) {
    await this.lists.findOne(workspaceId, spaceId, listId);
    return this.prisma.sprint.create({
      data: {
        listId,
        name: dto.name,
        goal: dto.goal,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async findAll(workspaceId: string, spaceId: string, listId: string) {
    await this.lists.findOne(workspaceId, spaceId, listId);
    return this.prisma.sprint.findMany({ where: { listId }, orderBy: { startDate: 'desc' } });
  }

  async findOne(workspaceId: string, spaceId: string, listId: string, sprintId: string) {
    await this.lists.findOne(workspaceId, spaceId, listId);
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { tasks: { orderBy: { position: 'asc' }, include: TASK_SUMMARY_INCLUDE } },
    });
    if (!sprint || sprint.listId !== listId) {
      throw new NotFoundException('Sprint not found.');
    }
    return sprint;
  }

  async update(workspaceId: string, spaceId: string, listId: string, sprintId: string, dto: UpdateSprintDto) {
    await this.findOne(workspaceId, spaceId, listId, sprintId);
    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(workspaceId: string, spaceId: string, listId: string, sprintId: string) {
    await this.findOne(workspaceId, spaceId, listId, sprintId);
    await this.prisma.$transaction([
      this.prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } }),
      this.prisma.sprint.delete({ where: { id: sprintId } }),
    ]);
    return { ok: true };
  }
}
