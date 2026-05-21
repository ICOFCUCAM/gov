import { CommandShell } from '@/components/ui/CommandShell';
import { OperationsLedger } from '@/components/features/OperationsLedger';
import { SubstrateLedger } from '@/components/features/SubstrateLedger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Operations Ledger' };

export default function LedgerPage() {
  return (
    <CommandShell active="ledger">
      <div className="space-y-6">
        <OperationsLedger />
        <div className="border-t border-line pt-4">
          <SubstrateLedger />
        </div>
      </div>
    </CommandShell>
  );
}
