import { CommandShell } from '@/components/ui/CommandShell';
import { Watchlist } from '@/components/features/Watchlist';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Watchlist' };

export default function WatchlistPage() {
  return (
    <CommandShell active="watchlist">
      <Watchlist />
    </CommandShell>
  );
}
