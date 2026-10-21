import { CommandShell } from '@/components/ui/CommandShell';
import { InstitutionalEditionSettings, InstitutionExports } from '@/components/features/InstitutionalEdition';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Institutional Edition' };

// The Institutional Edition (an installation as one institution standing alone)
// and institutions' portable exports (Health I4 standalone-and-pilot): the
// edition from the deployment profile (/api/sovereign/edition), exports through
// /api/org/ministries/{id}/export, two officials each.
export default function InstitutionalEditionPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        <p className="max-w-3xl text-sm text-ink-muted">
          Whether this installation runs as one institution standing alone, and each institution&apos;s own records as a sealed export it can take to another host or federate with later.
        </p>
        <InstitutionalEditionSettings />
        <InstitutionExports />
      </div>
    </CommandShell>
  );
}
