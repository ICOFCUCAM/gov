import { CommandShell } from '@/components/ui/CommandShell';
import { CharterList } from '@/components/features/CharterList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Charters' };

export default function CharterListPage() {
  return (
    <CommandShell active="charter">
      <CharterList />
    </CommandShell>
  );
}
