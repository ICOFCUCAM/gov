import { CommandShell } from '@/components/ui/CommandShell';
import { MinistriesConsole } from './MinistriesConsole';

export const dynamic = 'force-dynamic';

export default function MinistriesPage() {
  return (
    <CommandShell active="min">
      <h1 className="mb-1 text-2xl font-semibold">Institutions</h1>
      <p className="mb-4 text-ink-muted">
        A configurable organisational operating system: create ministries,
        departments, and agencies from sovereign archetypes; rename, merge,
        deactivate, and compose modules — without rewriting platform code.
      </p>
      <MinistriesConsole />
    </CommandShell>
  );
}
