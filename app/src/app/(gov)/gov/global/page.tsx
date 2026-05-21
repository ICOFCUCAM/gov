import { CommandShell } from '@/components/ui/CommandShell';
import { GlobalFeed } from '@/components/features/GlobalFeed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Global feed' };

export default function GlobalPage() {
  return (
    <CommandShell active="global">
      <GlobalFeed />
    </CommandShell>
  );
}
