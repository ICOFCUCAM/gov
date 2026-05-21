import { CommandShell } from '@/components/ui/CommandShell';
import { AuditCoverageSweep } from '@/components/features/AuditCoverageSweep';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coverage sweep' };

export default function CoverageSweepPage() {
  return (
    <CommandShell active="audit">
      <AuditCoverageSweep />
    </CommandShell>
  );
}
