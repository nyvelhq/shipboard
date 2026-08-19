import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Attachment, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const ATTACHMENT_INCLUDE = {
  uploader: { select: { id: true, name: true, email: true } },
} as const;

type AttachmentWithUploader = Attachment & { uploader: Pick<User, 'id' | 'name' | 'email'> };

// Attachment.sizeBytes is a Prisma BigInt, which JSON.stringify can't
// serialize on its own — Express would crash the response otherwise.
function serialize(attachment: AttachmentWithUploader) {
  return { ...attachment, sizeBytes: Number(attachment.sizeBytes) };
}

@Injectable()
export class AttachmentsService {
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
    file: Express.Multer.File,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachment = await this.prisma.attachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        url: `/uploads/${taskId}/${file.filename}`,
        filename: file.originalname,
        sizeBytes: BigInt(file.size),
        mimeType: file.mimetype,
      },
      include: ATTACHMENT_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return serialize(attachment);
  }

  async findAll(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachments = await this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: ATTACHMENT_INCLUDE,
    });
    return attachments.map(serialize);
  }

  async remove(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== taskId) {
      throw new NotFoundException('Attachment not found.');
    }
    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException('You can only delete your own attachments.');
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }
}
