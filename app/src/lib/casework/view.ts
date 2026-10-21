// What a reader sees of a case (docs/GOVERNMENT_OPERATING_MODEL.md §4.1 step
// 3): lists carry no personal fields; a case's own page carries them only for
// those the case rules let read it (caseReadRefusal()). Every case read, and
// every list (as one search naming how many cases it returned: a list still
// carries the parties' names of normal cases), is written to the access log
// by the route.

import { getPackage } from './packages';
import { isPersonalField } from '@/lib/forms/contract';
import type { Case } from './types';

/** A case for a list: no field whose personal-data class is personal, restricted or special (lib/forms/contract.ts), no parties' names when restricted, no verification results. */
export function listView(c: Case): Case {
  const pkg = getPackage(c.package.key, c.package.version);
  const personal = new Set((pkg?.fields ?? []).filter(isPersonalField).map(f => f.key));
  const fields = Object.fromEntries(Object.entries(c.fields).filter(([k]) => !personal.has(k)));
  const hide = c.sensitivity !== 'normal';
  return {
    ...c, fields,
    subject: hide ? c.subject.map(p => ({ kind: p.kind, name: '(restricted)' })) : c.subject.map(p => ({ ...p })),
    ...(c.applicant ? { applicant: hide ? { kind: c.applicant.kind, name: '(restricted)' } : c.applicant } : {}),
    history: [], // a list shows the stage and deadlines, not the steps
    ...(c.verifications ? { verifications: [] } : {}),
  };
}
