import { OperatorShell } from '@/components/ui/OperatorShell';
import { OperationsConsole } from './Console';

export const dynamic = 'force-dynamic';

export default function MinistryOperationsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <OperatorShell
      role="admin"
      who="Operational command · institution console"
      active="/ministries"
    >
      <OperationsConsole id={params.id} />
    </OperatorShell>
  );
}
