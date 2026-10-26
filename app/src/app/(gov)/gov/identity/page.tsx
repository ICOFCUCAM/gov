import { CommandShell } from '@/components/ui/CommandShell';
import { HumanServicesRegister } from '@/components/features/HumanServicesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National identity' };

export default function IdentityPage() {
  return (
    <CommandShell active="civil">
      <HumanServicesRegister kind="identity" />
    </CommandShell>
  );
}
