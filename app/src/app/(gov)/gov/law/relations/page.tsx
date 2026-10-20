import { CommandShell } from '@/components/ui/CommandShell';
import { LawRelations } from '@/components/features/LawRelations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'How laws relate' };

export default function LawRelationsPage() {
  return (
    <CommandShell active="law">
      <LawRelations />
    </CommandShell>
  );
}
