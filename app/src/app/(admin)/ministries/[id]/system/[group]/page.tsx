import { CommandShell } from '@/components/ui/CommandShell';
import { SubsystemConsole } from '@/components/features/SubsystemConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Subsystem Environment' };

export default async function SubsystemPage(props: { params: Promise<{ id: string; group: string }> }) {
  const params = await props.params;
  return (
    <CommandShell active="min">
      <SubsystemConsole id={params.id} group={params.group} />
    </CommandShell>
  );
}
