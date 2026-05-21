import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerRegistry } from '@/components/features/OfficerRegistry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Officer Registry' };

export default function OfficersPage() {
  return (
    <CommandShell active="officers">
      <OfficerRegistry />
    </CommandShell>
  );
}
