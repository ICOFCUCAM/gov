import { CommandShell } from '@/components/ui/CommandShell';
import { SubsystemConsole } from '@/components/features/SubsystemConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Subsystem Environment' };

export default function SubsystemPage({ params }: { params: { id: string; group: string } }) {
  return (
    <CommandShell active="min">
      <SubsystemConsole id={params.id} group={params.group} />
    </CommandShell>
  );
}
