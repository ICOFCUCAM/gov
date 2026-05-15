import { CommandShell } from '@/components/ui/CommandShell';
import { CommandHeading } from '@/components/ui/Telemetry';
import { MinistriesConsole } from './MinistriesConsole';

export const dynamic = 'force-dynamic';

export default function MinistriesPage() {
  return (
    <CommandShell active="min">
      <div className="space-y-2">
        <CommandHeading title="Institutions Admin" sub="Compose ministries, departments and agencies from sovereign archetypes — configurable, no platform rewrite." />
        <MinistriesConsole />
      </div>
    </CommandShell>
  );
}
