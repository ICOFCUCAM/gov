import { CommandShell } from '@/components/ui/CommandShell';
import { SealKeysRegister } from '@/components/features/SealKeysRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seal keys' };

// Seal keys (lib/keys/seal-register.ts, /api/seal-keys): the keys that may
// seal the state's decisions and certificates, each approved by the authority
// the nation's law names, with its validity, compromise and review.
export default function SealKeysPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        {/* The page's heading is the console tab bar's (National settings · Seal keys). */}
        <SealKeysRegister />
      </div>
    </CommandShell>
  );
}
