import { CommandShell } from '@/components/ui/CommandShell';
import { RegionalOverview } from '@/components/features/RegionalOverview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regional Overview' };


export default function RegionalOverviewPage({ searchParams }: { searchParams: { region?: string } }) {
  return (
    <CommandShell active="reg">
      <RegionalOverview initialRegion={searchParams.region} />
    </CommandShell>
  );
}
