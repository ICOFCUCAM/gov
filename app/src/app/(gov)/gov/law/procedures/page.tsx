import { CommandShell } from '@/components/ui/CommandShell';
import { ProceduresBoard } from '@/components/features/ProceduresBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Procedures' };

export default function ProceduresPage() {
  return (
    <CommandShell active="law">
      <ProceduresBoard />
    </CommandShell>
  );
}
