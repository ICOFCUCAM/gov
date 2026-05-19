import { CommandShell } from '@/components/ui/CommandShell';
import { MissionOrchestration } from '@/components/features/MissionOrchestration';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workflows & Missions' };


export default function NationalCoordinationPage() {
  return (
    <CommandShell active="coord">
      <MissionOrchestration />
    </CommandShell>
  );
}
