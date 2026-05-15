import type { Request } from 'express';

/** Authenticated principal derived from the sovereign IdP (OIDC). */
export interface Principal {
  sub: string; // OIDC subject
  tenantId: string; // tenant scope of this session
  displayName: string;
  roles: string[];
  permissions: string[]; // flattened from role bindings
  actorType: 'user' | 'system' | 'agent';
}

export interface AuthenticatedRequest extends Request {
  principal?: Principal;
}

export const PERMISSIONS_KEY = 'civic:permissions';
