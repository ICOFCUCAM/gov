import { AppShell } from '@/components/ui/AppShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';

// Institution workspace mounted inside the National Shell — its own
// internal navigation, command surface, and archetype-specialised tabs.
export default function MinistryWorkspacePage({ params }: { params: { id: string } }) {
  return (
    <AppShell active={`/gov/ministry/${params.id}`}>
      <MinistryWorkspace id={params.id} />
    </AppShell>
  );
}
