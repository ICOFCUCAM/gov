import { OperatorShell } from '@/components/ui/OperatorShell';
import { OpsCenter } from './OpsCenter';

export const dynamic = 'force-dynamic';

export default function OpsPage() {
  return (
    <OperatorShell
      role="ministry"
      who="Operations centre · platform team"
      active="/ops"
    >
      <h1 className="mb-1 text-2xl font-semibold">Operations centre</h1>
      <p className="mb-4 text-ink-muted">
        What is happening, where the bottlenecks are, what needs intervention.
        Calm by design — signals, not noise.
      </p>
      <OpsCenter />
    </OperatorShell>
  );
}
