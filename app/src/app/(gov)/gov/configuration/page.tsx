import { AppShell } from '@/components/ui/AppShell';
import { Cabinet } from '../Cabinet';

export const dynamic = 'force-dynamic';

// Sovereign configuration & administration (profile, presets, identity,
// national indicators, institutions register) — preserved from the
// original Cabinet, now distinct from the executive intelligence surface.
export default function CabinetConfigurationPage() {
  return (
    <AppShell active="/gov/configuration">
      <Cabinet />
    </AppShell>
  );
}
