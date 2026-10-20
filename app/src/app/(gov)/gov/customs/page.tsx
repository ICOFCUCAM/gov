import { CommandShell } from '@/components/ui/CommandShell';
import { CustomsRegister } from '@/components/features/CustomsRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customs' };

export default function Page() {
  return (
    <CommandShell active="fin">
      <CustomsRegister />
    </CommandShell>
  );
}
