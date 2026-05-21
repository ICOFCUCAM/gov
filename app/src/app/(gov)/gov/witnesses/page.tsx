import { CommandShell } from '@/components/ui/CommandShell';
import { AuditWitnesses } from '@/components/features/AuditWitnesses';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Witnesses' };

export default function WitnessesPage() {
  return (
    <CommandShell active="witnesses">
      <AuditWitnesses />
    </CommandShell>
  );
}
