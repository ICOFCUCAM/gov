import { CommandShell } from '@/components/ui/CommandShell';
import { AuditReplay } from '@/components/features/AuditReplay';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Replay' };

export default function AuditReplayPage() {
  return (
    <CommandShell active="audit-replay">
      <AuditReplay />
    </CommandShell>
  );
}
