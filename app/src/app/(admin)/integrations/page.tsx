import { CommandShell } from '@/components/ui/CommandShell';
import { TelemetryStrip, CommandHeading } from '@/components/ui/Telemetry';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <CommandShell active="intg">
      <div className="space-y-2">
        <CommandHeading title="Interoperability" sub="Controlled federation · scoped integrations · signed webhooks — nothing connects implicitly." />
        <TelemetryStrip
          items={[
            { l: 'Active clients', v: '18', t: 'ok', spark: true },
            { l: 'Pending approval', v: '4', t: 'warn', spark: true },
            { l: 'Federation grants', v: '11', t: 'ok', spark: true },
            { l: 'Webhook delivery', v: '99.6%', t: 'ok', spark: true },
            { l: 'Signature failures', v: '0', t: 'ok', sub: '24h' },
            { l: 'Rate-limit events', v: '7', t: 'warn', spark: true },
          ]}
        />
        <InteropConsole />
      </div>
    </CommandShell>
  );
}
