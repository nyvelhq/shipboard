import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { TaskOwnershipGuard } from '../common/guards/task-ownership.guard';
import { AttachmentsService } from './attachments.service';
import { CreateLinkAttachmentDto } from './dto/create-link-attachment.dto';

// Local disk storage — a deliberate MVP simplification, not the PRD's
// intended production path (S3 or equivalent). See HANDOFF.md.
const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard, TaskOwnershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/tasks/:taskId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const dir = join(UPLOAD_ROOT, String(req.params.taskId));
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}-${file.originalname}`);
        },
      }),
    }),
  )
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    return this.attachments.create(workspaceId, spaceId, listId, taskId, user.id, file);
  }

  @Post('link')
  createLink(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLinkAttachmentDto,
  ) {
    return this.attachments.createLink(workspaceId, spaceId, listId, taskId, user.id, dto.url, dto.label);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.attachments.findAll(workspaceId, spaceId, listId, taskId);
  }

  @Delete(':attachmentId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attachments.remove(workspaceId, spaceId, listId, taskId, attachmentId, user.id);
  }
}
