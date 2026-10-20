import { CommandShell } from '@/components/ui/CommandShell';
import { CivilRegister } from '@/components/features/CivilRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Civil registry' };

export default function CivilPage() {
  return (
    <CommandShell active="civil">
      <CivilRegister />
    </CommandShell>
  );
}
