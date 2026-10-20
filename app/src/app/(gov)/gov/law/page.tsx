import { CommandShell } from '@/components/ui/CommandShell';
import { LawsRegister } from '@/components/features/LawsRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laws' };

export default function LawsPage() {
  return (
    <CommandShell active="law">
      <LawsRegister />
    </CommandShell>
  );
}
