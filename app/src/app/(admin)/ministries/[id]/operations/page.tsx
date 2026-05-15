import { OperatorShell } from '@/components/ui/OperatorShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';

export default function MinistryOperationsPage({ params }: { params: { id: string } }) {
  return (
    <OperatorShell role="admin" who="Operational command · institution console" active="/ministries">
      <MinistryWorkspace id={params.id} />
    </OperatorShell>
  );
}
