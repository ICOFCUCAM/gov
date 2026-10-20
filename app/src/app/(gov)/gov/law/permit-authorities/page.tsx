import { CommandShell } from '@/components/ui/CommandShell';
import { PermitAuthorities } from '@/components/features/PermitAuthorities';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Permit authorities' };

export default function PermitAuthoritiesPage() {
  return (
    <CommandShell active="law">
      <PermitAuthorities />
    </CommandShell>
  );
}
