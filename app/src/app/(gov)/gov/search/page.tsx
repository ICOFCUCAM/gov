import { CommandShell } from '@/components/ui/CommandShell';
import { SubstrateSearch } from '@/components/features/SubstrateSearch';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <CommandShell active="search">
      <SubstrateSearch />
    </CommandShell>
  );
}
