import { CommandShell } from '@/components/ui/CommandShell';
import { OrganisationsRegister } from '@/components/features/OrganisationsRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Organisations' };

export default function OrganisationsPage() {
  return (
    <CommandShell active="civil">
      <OrganisationsRegister />
    </CommandShell>
  );
}
