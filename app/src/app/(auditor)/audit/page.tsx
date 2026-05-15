import { CommandShell } from '@/components/ui/CommandShell';
import { AuditView } from './AuditView';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <CommandShell active="aud">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Audit trail</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        Read-only oversight. Every state-changing action is recorded and
        tamper-evident. This view does not expose citizen records — only the
        ledger of what was done, by whom, to which resource.
      </p>
      <AuditView />
    </CommandShell>
  );
}
