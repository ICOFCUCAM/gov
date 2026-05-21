import { CommandShell } from '@/components/ui/CommandShell';
import { LiveWall } from '@/components/features/LiveWall';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Live Wall' };

export default function LivePage() {
  return (
    <CommandShell active="live">
      <LiveWall />
    </CommandShell>
  );
}
