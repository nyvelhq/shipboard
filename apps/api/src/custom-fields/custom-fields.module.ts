import { Module } from '@nestjs/common';
import { CustomFieldsController } from './custom-fields.controller';
import { ListCustomFieldsController } from './list-custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [ListsModule],
  controllers: [CustomFieldsController, ListCustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
