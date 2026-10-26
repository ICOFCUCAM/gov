// Plan I9 (federation and portability): requests between institutions.
import { CommandShell } from '@/components/ui/CommandShell';
import { CrossInstitutionWorkflows } from '@/components/features/exchange/CrossInstitutionWorkflows';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Requests between institutions' };

export default function Page() {
  return (
    <CommandShell active="intg">
      <CrossInstitutionWorkflows />
    </CommandShell>
  );
}
