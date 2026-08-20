import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Attachment, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StorageService } from '../storage/storage.service';
import { isElevatedRole } from '../common/roles';

const ATTACHMENT_INCLUDE = {
  uploader: { select: { id: true, name: true, email: true } },
} as const;

// A link attachment has no uploaded file — this sentinel mimeType (a real
// IANA type for "a URI, not a payload") lets the frontend tell it apart
// from an uploaded file without a schema migration for a boolean flag.
export const LINK_MIME_TYPE = 'text/uri-list';

type AttachmentWithUploader = Attachment & { uploader: Pick<User, 'id' | 'name' | 'email'> };

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly realtime: RealtimeGateway,
    private readonly storage: StorageService,
  ) {}

  // Attachment.url stores a bare storage key for uploaded files (never a
  // directly-usable URL — see StorageService), and an actual external URL
  // for link attachments. Resolve it here at read time so switching the
  // storage driver never needs a data migration. Also normalizes
  // sizeBytes, a Prisma BigInt JSON.stringify can't serialize on its own.
  private async serialize(attachment: AttachmentWithUploader) {
    const url = attachment.mimeType === LINK_MIME_TYPE ? attachment.url : await this.storage.resolveUrl(attachment.url);
    return { ...attachment, url, sizeBytes: Number(attachment.sizeBytes) };
  }

  async create(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const key = `${taskId}/${randomUUID()}-${file.originalname}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const attachment = await this.prisma.attachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        url: key,
        filename: file.originalname,
        sizeBytes: BigInt(file.size),
        mimeType: file.mimetype,
      },
      include: ATTACHMENT_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return this.serialize(attachment);
  }

  async createLink(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    userId: string,
    url: string,
    label?: string,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachment = await this.prisma.attachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        url,
        filename: label?.trim() || url,
        sizeBytes: BigInt(0),
        mimeType: LINK_MIME_TYPE,
      },
      include: ATTACHMENT_INCLUDE,
    });
    this.realtime.emitListChanged(listId);
    return this.serialize(attachment);
  }

  async findAll(workspaceId: string, spaceId: string, listId: string, taskId: string) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachments = await this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: ATTACHMENT_INCLUDE,
    });
    return Promise.all(attachments.map((a) => this.serialize(a)));
  }

  async remove(
    workspaceId: string,
    spaceId: string,
    listId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
    role: string,
  ) {
    await this.tasks.findOne(workspaceId, spaceId, listId, taskId);
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== taskId) {
      throw new NotFoundException('Attachment not found.');
    }
    if (attachment.uploadedBy !== userId && !isElevatedRole(role)) {
      throw new ForbiddenException('You can only delete your own attachments.');
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    if (attachment.mimeType !== LINK_MIME_TYPE) {
      await this.storage.delete(attachment.url).catch(() => undefined);
    }
    this.realtime.emitListChanged(listId);
    return { ok: true };
  }
}
