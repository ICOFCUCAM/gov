import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest, Principal } from './request-context';

/**
 * OIDC bearer authentication.
 *
 * Production: validate the JWT against the sovereign IdP's JWKS, check
 * issuer/audience/expiry, and map claims -> Principal. The sovereign IdP is
 * the only trust root (no social login, no vendor IdP) per Companion 03.
 *
 * This guard intentionally does NOT ship a bundled JWKS verifier to avoid a
 * heavy crypto dependency in the reference build; the verification seam is
 * `verifyToken()` and is the single place to wire the sovereign IdP.
 *
 * Dev mode (CIVIC_DEV_AUTH=1): accept an `x-civic-principal` header carrying
 * a base64url JSON principal, so the stack runs locally without an IdP.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (this.config.get('CIVIC_DEV_AUTH') === '1') {
      const header = req.header('x-civic-principal');
      if (header) {
        req.principal = this.decodeDevPrincipal(header);
        return true;
      }
    }

    const auth = req.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    req.principal = this.verifyToken(auth.slice('Bearer '.length));
    return true;
  }

  /**
   * SEAM: replace with sovereign-IdP JWKS verification. Until wired, only
   * dev mode is functional; production deployment MUST implement this.
   */
  private verifyToken(_token: string): Principal {
    throw new UnauthorizedException(
      'Token verification not configured: wire the sovereign IdP JWKS here',
    );
  }

  private decodeDevPrincipal(header: string): Principal {
    try {
      const json = Buffer.from(header, 'base64url').toString('utf8');
      const p = JSON.parse(json) as Partial<Principal>;
      if (!p.sub || !p.tenantId) throw new Error('sub and tenantId required');
      return {
        sub: p.sub,
        tenantId: p.tenantId,
        displayName: p.displayName ?? p.sub,
        roles: p.roles ?? [],
        permissions: p.permissions ?? [],
        actorType: p.actorType ?? 'user',
      };
    } catch (err) {
      throw new UnauthorizedException(
        `Invalid dev principal: ${(err as Error).message}`,
      );
    }
  }
}
