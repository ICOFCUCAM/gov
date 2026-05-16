import { CommandShell } from '@/components/ui/CommandShell';
import { NationalSimulation } from '@/components/features/NationalSimulation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Simulation' };

export default function SimulationPage() {
  return (
    <CommandShell active="sim">
      <NationalSimulation />
    </CommandShell>
  );
}
