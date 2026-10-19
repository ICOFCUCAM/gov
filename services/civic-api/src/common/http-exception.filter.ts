import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { MirrorAnswer } from './read-only-mirror.guard';

/** Uniform, plain-language error envelope. No stack traces to clients. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    // The mirror's answer to a write (the platform's, or a refusal): written as it is.
    if (exception instanceof MirrorAnswer) {
      for (const [k, v] of Object.entries(exception.answer.headers)) res.setHeader(k, v);
      res.status(exception.answer.status).json(exception.answer.body);
      return;
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Something went wrong on our side. Please try again.';

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      error: message,
      status,
      at: new Date().toISOString(),
    });
  }
}
