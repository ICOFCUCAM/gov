import { CommandShell } from '@/components/ui/CommandShell';
import { SystemMap } from '@/components/features/SystemMap';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'System map' };

export default function MapPage() {
  return (
    <CommandShell active="map">
      <SystemMap />
    </CommandShell>
  );
}
