import { CommandShell } from '@/components/ui/CommandShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Institution Workspace' };


// Institution workspace — its own internal navigation and archetype-
// specialised tabs, mounted in the unified sovereign command chrome.
export default async function MinistryWorkspacePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <CommandShell active="min">
      <MinistryWorkspace id={params.id} />
    </CommandShell>
  );
}
