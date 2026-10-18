import { CommandShell } from '@/components/ui/CommandShell';
import { WorkCenter } from '@/components/features/WorkCenter';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My work' };

export default function WorkPage() {
  return (
    <CommandShell active="work">
      <WorkCenter />
    </CommandShell>
  );
}
