import { CommandShell } from '@/components/ui/CommandShell';
import { SitesRegister } from '@/components/features/sites/SitesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sites' };

export default function SitesPage() {
  return (
    <CommandShell active="twin">
      <SitesRegister />
    </CommandShell>
  );
}
