import { CommandShell } from '@/components/ui/CommandShell';
import { CitizenIntakeQueue } from '@/components/features/CitizenIntakeQueue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Citizen Intake Queue' };

export default function IntakePage() {
  return (
    <CommandShell active="intake">
      <CitizenIntakeQueue />
    </CommandShell>
  );
}
