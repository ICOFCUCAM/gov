import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OperationsService } from './operations.service';

@Module({
  controllers: [OrgController],
  providers: [OrgService, OperationsService],
  exports: [OrgService],
})
export class OrgModule {}
