import { CommandShell } from '@/components/ui/CommandShell';
import { MinistriesConsole } from './MinistriesConsole';

export const dynamic = 'force-dynamic';

export default function MinistriesPage() {
  return (
    <CommandShell active="min">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Institutions</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        A configurable organisational operating system: create ministries,
        departments, and agencies from sovereign archetypes; rename, merge,
        deactivate, and compose modules — without rewriting platform code.
      </p>
      <MinistriesConsole />
    </CommandShell>
  );
}
