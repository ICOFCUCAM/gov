import { CommandShell } from '@/components/ui/CommandShell';
import { IndicatorDefinitionView } from '@/components/features/indicators/IndicatorDefinitionView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Indicator definition' };

// One indicator definition (plan step I3): its versions, approvals, value from the records and its contract.
export default async function IndicatorPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ institution?: string }> }) {
  const { id } = await props.params;
  const { institution } = await props.searchParams;
  return (
    <CommandShell active="twin">
      <IndicatorDefinitionView id={decodeURIComponent(id)} {...(institution ? { institution } : {})} />
    </CommandShell>
  );
}
