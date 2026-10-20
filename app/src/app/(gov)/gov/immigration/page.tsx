import { CommandShell } from '@/components/ui/CommandShell';
import { ImmigrationRegister } from '@/components/features/ImmigrationRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visas and permits' };

export default function ImmigrationPage() {
  return (
    <CommandShell active="civil">
      <ImmigrationRegister />
    </CommandShell>
  );
}
