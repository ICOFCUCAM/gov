import { CommandShell } from '@/components/ui/CommandShell';
import { InstitutionRelationships } from '@/components/features/InstitutionRelationships';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relationships between institutions' };

// The relationship register (plan phase 3; guidance §3.3): the powers one
// institution holds over another under the nation's law, both ways per
// institution, with the proposals waiting for a second official
// (/api/org/relationships).
export default function RelationshipsPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        {/* The page's heading is the console tab bar's (National settings · Relationships). */}
        <p className="max-w-3xl text-sm text-ink-muted">
          Which institution appoints, funds, instructs, audits or may ask for information from which other, under which law and between which dates.
          An instruction reaches an independent institution, or goes from one institution to another, only under an approved relationship;
          asking for information lets the named institution read only the records and purposes listed, never change them or decide.
        </p>
        <InstitutionRelationships />
      </div>
    </CommandShell>
  );
}
