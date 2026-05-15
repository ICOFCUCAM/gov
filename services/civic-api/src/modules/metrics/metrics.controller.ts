import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { registry } from '../../common/metrics';

/**
 * Prometheus scrape target. Unauthenticated by design (cluster-internal,
 * exposed only to the sovereign Prometheus via NetworkPolicy — never the
 * public ingress). Contains no citizen data.
 */
@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async scrape(): Promise<string> {
    return registry.metrics();
  }
}
