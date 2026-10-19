import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, Optional } from '@nestjs/common';
import { assertMirrorMode, frozenRefusal, isRead, type MirrorMode } from './read-only-mirror';
import { forwardWrite, type ForwardAnswer, type ForwardLookup } from './forward';

/** Optional provider: read-only lookups in civic-api's mirrored tables for the request mappers (forward.ts). */
export const FORWARD_LOOKUP = Symbol('FORWARD_LOOKUP');

/**
 * An answer civic-api gives in place of a controller: the platform's (or a
 * refusal). Thrown by the guard so that no controller, interceptor or audit
 * write runs; HttpExceptionFilter writes it as it is.
 */
export class MirrorAnswer extends HttpException {
  constructor(readonly answer: Pick<ForwardAnswer, 'status' | 'body' | 'headers'>) {
    super(answer.body as Record<string, unknown>, answer.status);
  }
}

/**
 * Global guard: civic-api is a mirror of the CivicOS platform
 * (read-only-mirror.ts). Reads pass to the controllers, which read the
 * mirrored tables. A write never reaches a controller, so civic-api writes
 * nothing of its own:
 *   - forward (default): it is passed to the owning platform route with the
 *     caller's own credentials and the platform's answer is returned
 *     (forward.ts); a write with no platform route answers 410;
 *   - frozen: it is refused with 410 and the owning platform route.
 * It runs before authentication (the platform decides who may act).
 */
@Injectable()
export class MirrorGuard implements CanActivate {
  private readonly mode: MirrorMode;

  constructor(@Optional() @Inject(FORWARD_LOOKUP) private readonly lookup?: ForwardLookup) {
    this.mode = assertMirrorMode();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method?: string; path?: string; originalUrl?: string; url?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown }>();
    const method = req.method ?? 'GET';
    if (isRead(method)) return true;
    const path = req.originalUrl ?? req.path ?? req.url ?? '';
    if (this.mode === 'frozen') {
      const refusal = frozenRefusal(method, path)!;
      throw new MirrorAnswer({
        status: refusal.status,
        body: { error: refusal.message, status: refusal.status, at: new Date().toISOString() },
        headers: { 'X-CivicOS-Owner': refusal.owner, 'X-CivicOS-Mode': 'frozen-read-only-mirror' },
      });
    }
    const answer = await forwardWrite(
      { method, path, headers: req.headers ?? {}, body: req.body },
      {
        base: process.env.CIVICOS_PLATFORM_URL!,
        timeoutMs: Number(process.env.CIVICOS_PLATFORM_TIMEOUT_MS) || 10_000,
        lookup: this.lookup,
      },
    );
    throw new MirrorAnswer(answer);
  }
}
