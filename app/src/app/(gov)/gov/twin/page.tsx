import { CommandShell } from '@/components/ui/CommandShell';
import { TwinWorkspace } from '@/components/features/TwinWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Twin' };

export default function NationalTwinPage() {
  return (
    <CommandShell active="twin">
      <TwinWorkspace />
    </CommandShell>
  );
}
