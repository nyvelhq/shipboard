import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InviteAcceptController } from './invite-accept.controller';
import { InvitesService } from './invites.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [InvitesController, InviteAcceptController],
  providers: [InvitesService],
})
export class InvitesModule {}
