import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

// Domain modules (WorkspacesModule, SpacesModule, ListsModule, TasksModule,
// SprintsModule, CustomFieldsModule, CommentsModule, AttachmentsModule, AuthModule)
// are Week 1-4 deliverables per HANDOFF.md — intentionally not stubbed here so
// there's no fake-finished scaffolding to unwind.
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
