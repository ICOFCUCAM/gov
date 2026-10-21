import { CommandShell } from '@/components/ui/CommandShell';
import { IndicatorRegister } from '@/components/features/indicators/IndicatorRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Indicators' };

// The indicator register (plan step I3): definitions, versions, approvals and current values with their markers.
export default function IndicatorsPage() {
  return (
    <CommandShell active="twin">
      <IndicatorRegister />
    </CommandShell>
  );
}
