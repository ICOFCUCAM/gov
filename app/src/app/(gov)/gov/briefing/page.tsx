import { ExecutiveBriefingChamber } from '@/components/features/ExecutiveBriefingChamber';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Executive Briefing Chamber' };

// Executive-facing strategic governance surface — renders its own
// full-screen institutional chrome (no AppShell).
export default function ExecutiveBriefingChamberPage() {
  return <ExecutiveBriefingChamber />;
}
