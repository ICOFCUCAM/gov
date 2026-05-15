import { AppShell } from '@/components/ui/AppShell';
import { OperationsConsole } from '@/app/(admin)/ministries/[id]/operations/Console';

export const dynamic = 'force-dynamic';

// The institution workspace, mounted inside the National Shell — the
// command rail stays persistent, so navigating ministries feels like one
// sovereign ecosystem, not isolated pages.
export default function MinistryWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AppShell active={`/gov/ministry/${params.id}`}>
      <OperationsConsole id={params.id} />
    </AppShell>
  );
}
