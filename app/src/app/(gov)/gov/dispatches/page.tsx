import { CommandShell } from '@/components/ui/CommandShell';
import { DispatchBoard } from '@/components/features/DispatchBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dispatch Board' };

export default function DispatchesPage() {
  return (
    <CommandShell active="dispatches">
      <DispatchBoard />
    </CommandShell>
  );
}
