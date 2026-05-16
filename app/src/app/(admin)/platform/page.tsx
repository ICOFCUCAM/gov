import { CommandShell } from '@/components/ui/CommandShell';
import { CommandHeading } from '@/components/ui/Telemetry';
import { PlatformConsole } from './PlatformConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Platform Operations' };


export default function PlatformPage() {
  return (
    <CommandShell active="plat">
      <div className="space-y-2">
        <CommandHeading title="Platform Operations" sub="Releases · deployments · tenancy · backups · signed configuration — gated, reversible, audited." />
        <PlatformConsole />
      </div>
    </CommandShell>
  );
}
