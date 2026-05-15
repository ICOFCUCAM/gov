import { OperatorShell } from '@/components/ui/OperatorShell';
import { PlatformConsole } from './PlatformConsole';

export const dynamic = 'force-dynamic';

export default function PlatformPage() {
  return (
    <OperatorShell
      role="admin"
      who="Platform operations · sovereign environment team"
      active="/platform"
    >
      <h1 className="mb-1 text-2xl font-semibold">Platform operations</h1>
      <p className="mb-4 text-ink-muted">
        Releases, deployments, tenant lifecycle, backups, and signed
        configuration. Every change is gated, reversible, and audited —
        humans approve, the platform records.
      </p>
      <PlatformConsole />
    </OperatorShell>
  );
}
