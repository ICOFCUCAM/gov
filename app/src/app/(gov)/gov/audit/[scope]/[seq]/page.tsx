import { CommandShell } from '@/components/ui/CommandShell';
import { AuditEntryDetail } from '@/components/features/AuditEntryDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit entry' };

export default async function AuditEntryPage({ params }: { params: Promise<{ scope: string; seq: string }> }) {
  const { scope, seq } = await params;
  return (
    <CommandShell active="audit">
      <AuditEntryDetail scope={decodeURIComponent(scope)} seq={Number(seq) | 0} />
    </CommandShell>
  );
}
