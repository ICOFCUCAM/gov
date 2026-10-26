import { CommandShell } from '@/components/ui/CommandShell';
import { ServiceManagementDesk } from '@/components/features/frontdoor/ServiceManagementDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Service management' };

// Plan step I13: performance computed from the records, objectives, reports, disruptions, changes, exceptions, dashboards.
export default function ServiceManagementPage() {
  return (
    <CommandShell active="ops">
      <ServiceManagementDesk />
    </CommandShell>
  );
}
