import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, type AuthenticatedRequest } from './request-context';

/** Decorator: @RequirePermissions('permit:decide') */
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

/**
 * Zero-trust RBAC: every protected handler declares the permissions it needs.
 * The principal's flattened permissions (from tenant-scoped role bindings)
 * must include all of them. No ambient authority; no implicit admin.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = req.principal;
    if (!principal) throw new ForbiddenException('No principal');

    const missing = required.filter(p => !principal.permissions.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission(s): ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
