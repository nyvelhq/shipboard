import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Verifies :taskId actually belongs to :listId/:spaceId/:workspaceId in the
 * URL. Needed ahead of any route with a side effect that happens before a
 * handler runs (e.g. FileInterceptor writing to disk) — WorkspaceMembershipGuard
 * alone isn't enough there, since guards run before interceptors and the
 * service-level ownership check inside the handler runs too late to stop
 * the write.
 */
@Injectable()
export class TaskOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { workspaceId, spaceId, listId, taskId } = request.params;

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { list: { include: { space: true } } },
    });

    if (
      !task ||
      task.listId !== listId ||
      task.list.spaceId !== spaceId ||
      task.list.space.workspaceId !== workspaceId
    ) {
      throw new NotFoundException('Task not found.');
    }
    return true;
  }
}
