import { CommandShell } from '@/components/ui/CommandShell';
import { TerritoryDesk } from '@/components/features/TerritoryDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planning, building control and housing' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <TerritoryDesk area="building" />
    </CommandShell>
  );
}
