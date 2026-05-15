import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerWorkspace } from './OfficerWorkspace';

export const dynamic = 'force-dynamic';

export default function ConsolePage() {
  return (
    <CommandShell active="con">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">My queue</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        Review applications, decide, and move on. Breaks are protected; the
        queue does not push work at you.
      </p>
      <OfficerWorkspace />
    </CommandShell>
  );
}
