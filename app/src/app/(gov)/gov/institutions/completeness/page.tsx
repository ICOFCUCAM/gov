import { CommandShell } from '@/components/ui/CommandShell';
import { CompletenessView } from '@/components/features/institutions/CompletenessView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Readiness by item' };

export default function Page() {
  return (
    <CommandShell active="min">
      <CompletenessView />
    </CommandShell>
  );
}
