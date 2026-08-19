import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateAcceptanceCriterionDto } from './dto/create-acceptance-criterion.dto';
import { UpdateAcceptanceCriterionDto } from './dto/update-acceptance-criterion.dto';

@Injectable()
export class AcceptanceCriteriaService {
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
    dto: CreateAcceptanceCriterionDto,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const position = await this.prisma.acceptanceCriterion.count({ where: { taskId } });
    const criterion = await this.prisma.acceptanceCriterion.create({
      data: { taskId, text: dto.text, position },
    });
    this.realtime.emitListChanged(listId);
    return criterion;
  }

  async findAll(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    return this.prisma.acceptanceCriterion.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
  }

  async update(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    criterionId: string,
    dto: UpdateAcceptanceCriterionDto,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const criterion = await this.prisma.acceptanceCriterion.findUnique({ where: { id: criterionId } });
    if (!criterion || criterion.taskId !== taskId) {
      throw new NotFoundException('Acceptance criterion not found.');
    }
    const updated = await this.prisma.acceptanceCriterion.update({
      where: { id: criterionId },
      data: { text: dto.text, completed: dto.completed },
    });
    this.realtime.emitListChanged(listId);
    return updated;
  }

  async remove(workspaceId: string, spaceId: string, listId: string, taskId: string, criterionId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const criterion = await this.prisma.acceptanceCriterion.findUnique({ where: { id: criterionId } });
    if (!criterion || criterion.taskId !== taskId) {
      throw new NotFoundException('Acceptance criterion not found.');
    }
    await this.prisma.acceptanceCriterion.delete({ where: { id: criterionId } });
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }
}
