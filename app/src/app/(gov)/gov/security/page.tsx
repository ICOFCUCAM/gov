import { CommandShell } from '@/components/ui/CommandShell';
import { NationalOverview } from '@/components/features/NationalOverview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Overview — Sovereign Operations Command Center' };


// National Overview — the apex Sovereign Operations Command Center
// (Head of Government), rendered within the national command chrome.
export default function NationalOverviewPage() {
  return (
    <CommandShell active="sec">
      <NationalOverview />
    </CommandShell>
  );
}
