import { Module } from '@nestjs/common';
import { PlatformOpsController } from './platform-ops.controller';
import { ReleaseService } from './release.service';
import { DeploymentService } from './deployment.service';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { BackupService } from './backup.service';
import { ConfigService } from './config.service';

@Module({
  controllers: [PlatformOpsController],
  providers: [
    ReleaseService,
    DeploymentService,
    TenantLifecycleService,
    BackupService,
    ConfigService,
  ],
})
export class PlatformOpsModule {}
