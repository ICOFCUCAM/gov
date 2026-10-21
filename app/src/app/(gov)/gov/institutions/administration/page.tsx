import { CommandShell } from '@/components/ui/CommandShell';
import { AdministrationWorkspace } from '@/components/features/institutions/AdministrationWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Internal administration' };

export default function Page() {
  return (
    <CommandShell active="min">
      <AdministrationWorkspace />
    </CommandShell>
  );
}
