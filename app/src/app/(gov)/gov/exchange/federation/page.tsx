// Plan I9 (federation and portability): events between institutions.
import { CommandShell } from '@/components/ui/CommandShell';
import { FederationEvents } from '@/components/features/exchange/FederationEvents';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Events between institutions' };

export default function Page() {
  return (
    <CommandShell active="intg">
      <FederationEvents />
    </CommandShell>
  );
}
