import { CommandShell } from '@/components/ui/CommandShell';
import { NationalSimulation } from '@/components/features/NationalSimulation';
import { scenarioFor, type ScenarioKey } from '@/lib/gov/simulation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Simulation' };

export default function SimulationPage({ searchParams }: { searchParams: { s?: string } }) {
  const initial = scenarioFor(searchParams.s as ScenarioKey).key;
  return (
    <CommandShell active="sim">
      <NationalSimulation initial={initial} />
    </CommandShell>
  );
}
