import { CommandShell } from '@/components/ui/CommandShell';
import { DepartmentRecords } from '@/components/features/institutions/DepartmentRecords';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Departments' };

export default function Page() {
  return (
    <CommandShell active="min">
      <DepartmentRecords />
    </CommandShell>
  );
}
