// Plan I9 (federation and portability): when a service is unavailable.
import { CommandShell } from '@/components/ui/CommandShell';
import { DeclaredStates } from '@/components/features/exchange/DeclaredStates';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'When a service is unavailable' };

export default function Page() {
  return (
    <CommandShell active="intg">
      <DeclaredStates />
    </CommandShell>
  );
}
