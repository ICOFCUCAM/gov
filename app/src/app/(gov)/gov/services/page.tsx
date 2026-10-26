import { CommandShell } from '@/components/ui/CommandShell';
import { ServiceCatalogueDesk } from '@/components/features/frontdoor/ServiceCatalogueDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Service catalogue' };

// Plan step I13: the public service catalogue for officials (lib/frontdoor/catalogue.ts).
export default function ServiceCataloguePage() {
  return (
    <CommandShell active="ops">
      <ServiceCatalogueDesk />
    </CommandShell>
  );
}
