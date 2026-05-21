import { CommandShell } from '@/components/ui/CommandShell';
import { AuditExplorer } from '@/components/features/AuditExplorer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Explorer' };

export default function AuditPage() {
  return (
    <CommandShell active="audit">
      <AuditExplorer />
    </CommandShell>
  );
}
