import { CommandShell } from '@/components/ui/CommandShell';
import { CapabilityManifestView } from '@/components/features/institutions/CapabilityManifestView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'What it has' };

export default function Page() {
  return (
    <CommandShell active="min">
      <CapabilityManifestView />
    </CommandShell>
  );
}
