import { CommandShell } from '@/components/ui/CommandShell';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <CommandShell active="intg">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Interoperability</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        Controlled federation, scoped integrations, signed webhooks. Nothing
        connects implicitly — every integration is approved, every grant is
        explicit, every webhook is signed.
      </p>
      <InteropConsole />
    </CommandShell>
  );
}
