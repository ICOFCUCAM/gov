import { CommandShell } from '@/components/ui/CommandShell';
import { RegionalOverview } from '@/components/features/RegionalOverview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regional Overview' };


export default async function RegionalOverviewPage(props: { searchParams: Promise<{ region?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <CommandShell active="reg">
      <RegionalOverview initialRegion={searchParams.region} />
    </CommandShell>
  );
}
