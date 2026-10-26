// Test fixture: approve an integration the way an installation does, by two
// officials (one proposes its scopes and purposes, a different one confirms).
import { proposeIntegrationApproval, confirmIntegrationApproval } from './store';
import type { IntegrationClient } from '@/lib/api/types';

export function approveIntegration(id: string, terms: { scopes?: string[]; purposes?: Record<string, string[]>; institution?: string } = {}, proposer = 'First official', confirmer = 'Second official'): IntegrationClient | { error: string } {
  const p = proposeIntegrationApproval(id, terms, proposer);
  if ('error' in p) return p;
  return confirmIntegrationApproval(id, confirmer);
}
