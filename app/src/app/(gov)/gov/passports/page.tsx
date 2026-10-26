import { CommandShell } from '@/components/ui/CommandShell';
import { HumanServicesRegister } from '@/components/features/HumanServicesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Passports and travel documents' };

export default function PassportsPage() {
  return (
    <CommandShell active="civil">
      <HumanServicesRegister kind="passports" />
    </CommandShell>
  );
}
