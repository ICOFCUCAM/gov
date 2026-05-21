import { CommandShell } from '@/components/ui/CommandShell';
import { TelemetryWall } from '@/components/features/TelemetryWall';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Telemetry Wall' };

export default function TelemetryPage() {
  return (
    <CommandShell active="telemetry">
      <TelemetryWall />
    </CommandShell>
  );
}
