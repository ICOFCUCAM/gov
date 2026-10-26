import { CommandShell } from '@/components/ui/CommandShell';
import { TerritoryDesk } from '@/components/features/TerritoryDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Land dealings and disputes' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <TerritoryDesk area="land" />
    </CommandShell>
  );
}
