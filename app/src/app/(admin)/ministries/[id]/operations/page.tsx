import { CommandShell } from '@/components/ui/CommandShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Institution Operations' };


export default async function MinistryOperationsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <CommandShell active="min">
      <MinistryWorkspace id={params.id} />
    </CommandShell>
  );
}
