import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';

const TASK_SUMMARY = { select: { id: true, name: true, status: true } } as const;

@Injectable()
export class TaskDependenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    dto: CreateTaskDependencyDto,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);

    if (dto.blockingTaskId === taskId) {
      throw new BadRequestException('A task cannot block itself.');
    }
    // Ownership-chain check doubles as "same List" validation — a task
    // dependency only makes sense between two tasks on the same board.
    await this.tasks.findOne(workspaceId, spaceId, listId, dto.blockingTaskId);

    const existing = await this.prisma.taskDependency.findFirst({
      where: { blockingTaskId: dto.blockingTaskId, blockedTaskId: taskId },
    });
    if (existing) {
      throw new BadRequestException('This dependency already exists.');
    }

    if (await this.wouldCreateCycle(listId, taskId, dto.blockingTaskId)) {
      throw new BadRequestException(
        'This would create a circular dependency — that task is already (directly or indirectly) blocked by this one.',
      );
    }

    const dependency = await this.prisma.taskDependency.create({
      data: { blockingTaskId: dto.blockingTaskId, blockedTaskId: taskId },
      include: { blockingTask: TASK_SUMMARY, blockedTask: TASK_SUMMARY },
    });
    this.realtime.emitListChanged(listId);
    return dependency;
  }

  async findAll(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const [blockedBy, blocking] = await Promise.all([
      this.prisma.taskDependency.findMany({
        where: { blockedTaskId: taskId },
        include: { blockingTask: TASK_SUMMARY },
      }),
      this.prisma.taskDependency.findMany({
        where: { blockingTaskId: taskId },
        include: { blockedTask: TASK_SUMMARY },
      }),
    ]);
    return { blockedBy, blocking };
  }

  async remove(workspaceId: string, spaceId: string, listId: string, taskId: string, dependencyId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const dependency = await this.prisma.taskDependency.findUnique({ where: { id: dependencyId } });
    if (!dependency || (dependency.blockedTaskId !== taskId && dependency.blockingTaskId !== taskId)) {
      throw new NotFoundException('Dependency not found.');
    }
    await this.prisma.taskDependency.delete({ where: { id: dependencyId } });
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }

  // Would linking blockingTaskId -> startTaskId (startTaskId depends on
  // blockingTaskId) close a cycle? True iff blockingTaskId is already
  // (transitively) blocked by startTaskId — i.e. there's already a path
  // startTaskId -> ... -> blockingTaskId through existing "blocks" edges.
  // Scoped to one List's dependency graph, which is small enough to hold
  // in memory rather than needing a recursive SQL query.
  private async wouldCreateCycle(listId: string, startTaskId: string, targetTaskId: string): Promise<boolean> {
    const links = await this.prisma.taskDependency.findMany({
      where: { blockingTask: { listId } },
      select: { blockingTaskId: true, blockedTaskId: true },
    });
    const adjacency = new Map<string, string[]>();
    for (const link of links) {
      if (!adjacency.has(link.blockingTaskId)) adjacency.set(link.blockingTaskId, []);
      adjacency.get(link.blockingTaskId)!.push(link.blockedTaskId);
    }

    const visited = new Set<string>([startTaskId]);
    const queue = [startTaskId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetTaskId) return true;
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  }
}
