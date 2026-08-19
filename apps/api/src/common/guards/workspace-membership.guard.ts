import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Applied to every route nested under /workspaces/:workspaceId/*.
 * This is the single choke point the PRD calls out as the Week 1-2 risk:
 * every hierarchy resource (Space, Folder, List, ...) must resolve back to
 * a workspaceId and pass through here before a handler ever runs.
 */
@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId: string | undefined = request.params.workspaceId;
    const userId: string | undefined = request.user?.id;

    if (!workspaceId || !userId) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    request.membership = membership;
    return true;
  }
}
