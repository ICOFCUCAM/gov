import { CommandShell } from '@/components/ui/CommandShell';
import { HumanServicesRegister } from '@/components/features/HumanServicesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Labour and employment' };

export default function LabourPage() {
  return (
    <CommandShell active="civil">
      <HumanServicesRegister kind="labour" />
    </CommandShell>
  );
}
