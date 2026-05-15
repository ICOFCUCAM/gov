import { CommandShell } from '@/components/ui/CommandShell';
import { AuditView } from './AuditView';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <CommandShell active="aud">
      <h1 className="mb-1 text-2xl font-semibold">Audit trail</h1>
      <p className="mb-4 text-ink-muted">
        Read-only oversight. Every state-changing action is recorded and
        tamper-evident. This view does not expose citizen records — only the
        ledger of what was done, by whom, to which resource.
      </p>
      <AuditView />
    </CommandShell>
  );
}
