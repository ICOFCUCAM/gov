// Direct route to the 9-domain sovereign operating ecosystem wall. Mounted
// like the agency apps (app/(app)/app/[domain]/[[...sub]]/page.tsx): the
// Simulation notice in production, the health registers' records first, the
// simulated tiles folded to "Not connected" in production and marked Sample
// in demo and training.
import { HealthEcosystemWall } from '@/apps/ministry-health/HealthEcosystemWall';
import { SimulationNotice } from '@/components/ui/SimulationNotice';
import { installationMode } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';

export default function HealthEcosystemPage() {
  const mode = installationMode();
  return (
    <>
      {mode === 'production' ? <SimulationNotice what="This health operations wall" /> : null}
      <HealthEcosystemWall mode={mode} standalone />
    </>
  );
}
