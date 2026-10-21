import { CommandShell } from '@/components/ui/CommandShell';
import { PilotExitGate } from '@/components/features/PilotExitGate';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pilot exit gate' };

// The pilot's exit gate for the health institutions (S6-I-11), computed from the records (/api/pilot/exit-gate).
export default function Page() {
  return (
    <CommandShell active="civil">
      <PilotExitGate />
    </CommandShell>
  );
}
