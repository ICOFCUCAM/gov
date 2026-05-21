import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerWorkbench } from '@/components/features/OfficerWorkbench';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Officer Workbench' };

export default function WorkbenchPage() {
  return (
    <CommandShell active="workbench">
      <OfficerWorkbench />
    </CommandShell>
  );
}
