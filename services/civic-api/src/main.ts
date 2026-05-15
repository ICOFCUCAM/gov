import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Security baseline (zero-trust posture starts at the edge).
  app.use(helmet());
  app.enableCors({
    origin: process.env.CIVIC_CORS_ORIGINS?.split(',') ?? false,
    credentials: true,
  });
  // Input validation is done explicitly with Zod in each controller
  // (typed, no decorator metadata, no class-validator dependency).
  app.setGlobalPrefix('api');

  // OpenAPI contract — generated from code; the single source of API truth.
  const config = new DocumentBuilder()
    .setTitle('CivicOS API')
    .setDescription(
      'Sovereign operational backend. Multi-tenant, event-driven, ' +
        'append-only audit. Humans govern; AI assists.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`CivicOS API listening on :${port} (/api, /api/docs)`);
}

void bootstrap();
