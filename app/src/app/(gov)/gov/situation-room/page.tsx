import { StrategicDashboard } from '@/components/features/StrategicDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Strategic Dashboard' };


// Flagship surface — renders its own full-screen command chrome, no AppShell.
export default function SituationRoomPage() {
  return <StrategicDashboard />;
}
