import { SituationRoom } from '@/components/features/SituationRoom';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Situation Room' };


// Flagship surface — renders its own full-screen command chrome, no AppShell.
export default function SituationRoomPage() {
  return <SituationRoom />;
}
