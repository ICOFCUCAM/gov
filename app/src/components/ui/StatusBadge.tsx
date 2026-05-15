import { Pill, type PillTone } from './Pill';
import type { PermitStatus } from '@/lib/api/types';

const permitTone: Record<PermitStatus, PillTone> = {
  draft: 'neutral',
  submitted: 'neutral',
  'in-review': 'warn',
  'needs-info': 'warn',
  approved: 'ok',
  declined: 'alert',
};

const permitLabel: Record<PermitStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  'in-review': 'In review',
  'needs-info': 'Action needed',
  approved: 'Approved',
  declined: 'Declined',
};

export function PermitStatusBadge({ status }: { status: PermitStatus }) {
  return <Pill tone={permitTone[status]}>{permitLabel[status]}</Pill>;
}

export function BillStatusBadge({ status }: { status: 'due' | 'paid' | 'overdue' }) {
  const tone: PillTone = status === 'paid' ? 'ok' : status === 'overdue' ? 'alert' : 'warn';
  const label = status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Due';
  return <Pill tone={tone}>{label}</Pill>;
}
