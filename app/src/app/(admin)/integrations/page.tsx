import { CommandShell } from '@/components/ui/CommandShell';
import { CommandHeading } from '@/components/ui/Telemetry';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <CommandShell active="intg">
      <div className="space-y-2">
        <CommandHeading title="Interoperability" sub="Controlled federation · scoped integrations · signed webhooks — nothing connects implicitly." />
        <InteropConsole />
      </div>
    </CommandShell>
  );
}
