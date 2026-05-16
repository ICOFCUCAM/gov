import { CommandShell } from '@/components/ui/CommandShell';
import { RegionalOverview } from '@/components/features/RegionalOverview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regional Overview' };


export default function RegionalOverviewPage() {
  return (
    <CommandShell active="reg">
      <RegionalOverview />
    </CommandShell>
  );
}
