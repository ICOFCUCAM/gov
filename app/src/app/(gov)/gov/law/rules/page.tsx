import { CommandShell } from '@/components/ui/CommandShell';
import { RulesBoard } from '@/components/features/RulesBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rates and tariffs' };

export default function Page() {
  return (
    <CommandShell active="law">
      <RulesBoard />
    </CommandShell>
  );
}
