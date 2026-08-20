import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateInviteDto } from './dto/create-invite.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INVITE_INCLUDE = {
  inviter: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Creating an invite for an email that already has one pending replaces
  // it (fresh token, fresh expiry) rather than erroring — "invite" and
  // "resend" are the same action from the inviter's point of view.
  async create(workspaceId: string, inviterId: string, dto: CreateInviteDto) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found.');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const existingMembership = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (existingMembership) {
        throw new BadRequestException('This person is already a member of this workspace.');
      }
    }

    await this.prisma.workspaceInvite.deleteMany({
      where: { workspaceId, email: dto.email, acceptedAt: null },
    });

    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: dto.email,
        role: dto.role,
        token: randomBytes(32).toString('hex'),
        invitedBy: inviterId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      include: INVITE_INCLUDE,
    });

    const acceptUrl = `${frontendUrl()}/invites/${invite.token}`;
    await this.email.sendInviteEmail({
      to: invite.email,
      workspaceName: workspace.name,
      inviterName: inviter!.name,
      role: invite.role,
      acceptUrl,
    });

    return invite;
  }

  listPending(workspaceId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: INVITE_INCLUDE,
    });
  }

  async revoke(workspaceId: string, inviteId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new NotFoundException('Invite not found.');
    }
    await this.prisma.workspaceInvite.delete({ where: { id: inviteId } });
    return { ok: true };
  }

  // Public — no auth. Powers the accept page's preview before the visitor
  // has necessarily signed in, so it returns only what's safe to show
  // someone holding the link: no token, no other members' data.
  async getByToken(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } }, inviter: { select: { name: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found.');
    return {
      workspaceName: invite.workspace.name,
      inviterName: invite.inviter.name,
      email: invite.email,
      role: invite.role,
      accepted: invite.acceptedAt !== null,
      expired: invite.expiresAt < new Date(),
    };
  }

  async accept(token: string, userId: string, userEmail: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found.');
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired — ask for a new one.');
    }
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invite was sent to a different email address.');
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (!existingMembership) {
      await this.prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
      });
    }
    if (!invite.acceptedAt) {
      await this.prisma.workspaceInvite.update({ where: { token }, data: { acceptedAt: new Date() } });
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
    return { workspaceId: invite.workspaceId, workspaceName: workspace!.name };
  }
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3001';
}
