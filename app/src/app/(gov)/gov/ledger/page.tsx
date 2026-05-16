import { CommandShell } from '@/components/ui/CommandShell';
import { OperationsLedger } from '@/components/features/OperationsLedger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Operations Ledger' };

export default function LedgerPage() {
  return (
    <CommandShell active="ledger">
      <OperationsLedger />
    </CommandShell>
  );
}
