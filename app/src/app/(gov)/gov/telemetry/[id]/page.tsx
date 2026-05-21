import { CommandShell } from '@/components/ui/CommandShell';
import { TelemetryStreamDetail } from '@/components/features/TelemetryStreamDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Telemetry stream' };

export default async function StreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CommandShell active="telemetry">
      <TelemetryStreamDetail streamId={decodeURIComponent(id)} />
    </CommandShell>
  );
}
