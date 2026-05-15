import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma client. In production this points at the sovereign Postgres
 * (primary + read replicas). The client is the ONLY place that talks SQL;
 * swapping the datastore is a matter of replacing this provider.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      // The API must start even if the DB is briefly unreachable; health
      // checks report degraded and a retry loop reconnects.
      this.logger.warn(`Database not reachable at boot: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
