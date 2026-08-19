import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCommentDto } from './dto/create-comment.dto';

const COMMENT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class CommentsService {
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
    userId: string,
    dto: CreateCommentDto,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId); // ownership-chain check
    const comment = await this.prisma.comment.create({
      data: { taskId, userId, body: dto.body },
      include: COMMENT_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return comment;
  }

  async findAll(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: COMMENT_INCLUDE,
    });
  }

  async remove(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    commentId: string,
    userId: string,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.taskId !== taskId) {
      throw new NotFoundException('Comment not found.');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments.');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }
}
