import { CommandShell } from '@/components/ui/CommandShell';
import { Cabinet } from '../Cabinet';

export const dynamic = 'force-dynamic';

// Sovereign configuration & administration (profile, presets, identity,
// national indicators, institutions register) — integrated into the
// unified sovereign command chrome.
export default function CabinetConfigurationPage() {
  return (
    <CommandShell active="cfg">
      <Cabinet />
    </CommandShell>
  );
}
