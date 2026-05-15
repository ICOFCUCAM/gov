import { CommandShell } from '@/components/ui/CommandShell';
import { OpsCenter } from './OpsCenter';

export const dynamic = 'force-dynamic';

export default function OpsPage() {
  return (
    <CommandShell active="ops">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Operations centre</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        What is happening, where the bottlenecks are, what needs intervention.
        Calm by design — signals, not noise.
      </p>
      <OpsCenter />
    </CommandShell>
  );
}
