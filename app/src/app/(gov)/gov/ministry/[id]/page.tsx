import { CommandShell } from '@/components/ui/CommandShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';

// Institution workspace — its own internal navigation and archetype-
// specialised tabs, mounted in the unified sovereign command chrome.
export default function MinistryWorkspacePage({ params }: { params: { id: string } }) {
  return (
    <CommandShell active="min">
      <MinistryWorkspace id={params.id} />
    </CommandShell>
  );
}
