import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerWorkspace } from './OfficerWorkspace';

export const dynamic = 'force-dynamic';

export default function ConsolePage() {
  return (
    <CommandShell active="con">
      <h1 className="mb-1 text-2xl font-semibold">My queue</h1>
      <p className="mb-4 text-ink-muted">
        Review applications, decide, and move on. Breaks are protected; the
        queue does not push work at you.
      </p>
      <OfficerWorkspace />
    </CommandShell>
  );
}
