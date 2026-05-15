import { CommandShell } from '@/components/ui/CommandShell';
import { TelemetryStrip, CommandHeading } from '@/components/ui/Telemetry';
import { PlatformConsole } from './PlatformConsole';

export const dynamic = 'force-dynamic';

export default function PlatformPage() {
  return (
    <CommandShell active="plat">
      <div className="space-y-2">
        <CommandHeading title="Platform Operations" sub="Releases · deployments · tenancy · backups · signed configuration — gated, reversible, audited." />
        <TelemetryStrip
          items={[
            { l: 'Environment', v: 'Production', t: 'ok', sub: 'sovereign' },
            { l: 'Release channel', v: 'Stable', t: 'ok', spark: true },
            { l: 'Active tenants', v: '47', t: 'ok', spark: true },
            { l: 'Pending gates', v: '3', t: 'warn', spark: true },
            { l: 'Backup integrity', v: 'Intact', t: 'ok', sub: 'last 12m' },
            { l: 'Config drift', v: '0', t: 'ok', spark: true },
          ]}
        />
        <PlatformConsole />
      </div>
    </CommandShell>
  );
}
