import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { assertFrozenMode, frozenRefusal } from './read-only-mirror';

/**
 * Global guard: civic-api is a frozen read-only mirror (read-only-mirror.ts).
 * Reads pass; every write is refused with 410 Gone and the owning platform
 * route, before authentication or any controller runs, so nothing is written.
 */
@Injectable()
export class ReadOnlyMirrorGuard implements CanActivate {
  constructor() {
    assertFrozenMode();
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ method?: string; path?: string; originalUrl?: string; url?: string }>();
    const refusal = frozenRefusal(req.method ?? 'GET', req.originalUrl ?? req.path ?? req.url ?? '');
    if (!refusal) return true;
    const res = context.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>();
    res.setHeader?.('X-CivicOS-Owner', refusal.owner);
    res.setHeader?.('X-CivicOS-Mode', 'frozen-read-only-mirror');
    throw new HttpException(refusal.message, refusal.status);
  }
}
