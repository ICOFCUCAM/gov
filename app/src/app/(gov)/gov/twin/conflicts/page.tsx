import { CommandShell } from '@/components/ui/CommandShell';
import { TwinConflicts } from '@/components/features/TwinConflicts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sources that disagree' };

export default function TwinConflictsPage() {
  return (
    <CommandShell active="twin">
      <TwinConflicts />
    </CommandShell>
  );
}
