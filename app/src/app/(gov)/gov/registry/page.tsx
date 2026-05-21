import { CommandShell } from '@/components/ui/CommandShell';
import { InstitutionsCatalogue } from '@/components/features/InstitutionsCatalogue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Institutions Catalogue' };

export default function RegistryPage() {
  return (
    <CommandShell active="registry">
      <InstitutionsCatalogue />
    </CommandShell>
  );
}
