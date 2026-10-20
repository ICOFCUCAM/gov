import { CommandShell } from '@/components/ui/CommandShell';
import { ProceduresBoard } from '@/components/features/ProceduresBoard';
import { samplesAllowed } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Procedures' };

export default function ProceduresPage() {
  return (
    <CommandShell active="law">
      <ProceduresBoard demonstration={samplesAllowed()} />
    </CommandShell>
  );
}
