import { Module } from '@nestjs/common';
import { InteropController } from './interop.controller';
import { IntegrationService } from './integration.service';
import { FederationService } from './federation.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [InteropController],
  providers: [IntegrationService, FederationService, WebhookService],
  // FederationService is exported so other modules can call assertAccess()
  // before serving any cross-tenant read/action.
  exports: [FederationService],
})
export class InteropModule {}
