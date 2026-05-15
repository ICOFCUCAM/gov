import { OperatorShell } from '@/components/ui/OperatorShell';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <OperatorShell
      role="admin"
      who="Integration governance · platform team"
      active="/integrations"
    >
      <h1 className="mb-1 text-2xl font-semibold">Interoperability</h1>
      <p className="mb-4 text-ink-muted">
        Controlled federation, scoped integrations, signed webhooks. Nothing
        connects implicitly — every integration is approved, every grant is
        explicit, every webhook is signed.
      </p>
      <InteropConsole />
    </OperatorShell>
  );
}
