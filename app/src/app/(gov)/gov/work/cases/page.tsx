import { CommandShell } from '@/components/ui/CommandShell';
import { CaseLoader } from '@/components/features/CaseLoader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Load cases' };

export default function LoadCasesPage() {
  return (
    <CommandShell active="work">
      <CaseLoader />
    </CommandShell>
  );
}
