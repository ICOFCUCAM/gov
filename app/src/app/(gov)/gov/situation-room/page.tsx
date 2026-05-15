import { AppShell } from '@/components/ui/AppShell';
import { SituationRoom } from '@/components/features/SituationRoom';

export const dynamic = 'force-dynamic';

export default function SituationRoomPage() {
  return (
    <AppShell active="/gov/situation-room">
      <SituationRoom />
    </AppShell>
  );
}
