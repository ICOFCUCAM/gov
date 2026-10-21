import { CommandShell } from '@/components/ui/CommandShell';
import { WorkspaceHome } from '@/components/features/WorkspaceHome';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My workspace' };

// The shared workspace shell (docs/CONSTITUTIONAL_ARCHITECTURE.md §6.6; plan phase 4): every official's home
// panels, filled from their own office and institution.
export default function WorkspacePage() {
  return (
    <CommandShell active="work">
      <WorkspaceHome />
    </CommandShell>
  );
}
