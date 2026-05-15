import { CommandShell } from '@/components/ui/CommandShell';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <CommandShell active="intg">
      <h1 className="mb-1 text-2xl font-semibold">Interoperability</h1>
      <p className="mb-4 text-ink-muted">
        Controlled federation, scoped integrations, signed webhooks. Nothing
        connects implicitly — every integration is approved, every grant is
        explicit, every webhook is signed.
      </p>
      <InteropConsole />
    </CommandShell>
  );
}
