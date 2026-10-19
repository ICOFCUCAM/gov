import { Pill, type PillTone } from './Pill';
import type { PermitStatus } from '@/lib/api/types';
import { nationMessages } from '@/lib/nation/registry';
import type { Messages } from '@/lib/i18n';
const permitTone: Record<PermitStatus, PillTone> = {
  draft: 'neutral',
  submitted: 'neutral',
  'in-review': 'warn',
  'needs-info': 'warn',
  approved: 'ok',
  declined: 'alert',
};

// Labels in the nation's language (lib/i18n `more`); the status values are unchanged.
const permitLabel = (m: Messages['more']): Record<PermitStatus, string> => ({
  draft: m.draft,
  submitted: m.submitted,
  'in-review': m.inReview,
  'needs-info': m.needsInfo,
  approved: m.approved,
  declined: m.declined,
});

export function PermitStatusBadge({ status }: { status: PermitStatus }) {
  return <Pill tone={permitTone[status]}>{permitLabel(nationMessages().more)[status]}</Pill>;
}

export function BillStatusBadge({ status }: { status: 'due' | 'paid' | 'overdue' }) {
  const tone: PillTone = status === 'paid' ? 'ok' : status === 'overdue' ? 'alert' : 'warn';
  const m = nationMessages().more;
  const label = status === 'paid' ? m.billPaid : status === 'overdue' ? m.billOverdue : m.billDue;
  return <Pill tone={tone}>{label}</Pill>;
}
