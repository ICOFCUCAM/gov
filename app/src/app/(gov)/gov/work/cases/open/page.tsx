import { CommandShell } from '@/components/ui/CommandShell';
import { CasesBoard } from '@/components/features/CasesBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cases' };

export default function OpenCasesPage() {
  return (
    <CommandShell active="work">
      <CasesBoard />
    </CommandShell>
  );
}
