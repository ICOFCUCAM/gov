import { CommandShell } from '@/components/ui/CommandShell';
import { ConstitutionalProfile } from '@/components/features/ConstitutionalProfile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Constitutional profile' };

// The constitutional profile (plan phase 5; guidance §7.4): the parts of the
// constitution the platform enforces, approved together as one version
// through the nation's own legal process, with the date it applies from
// (/api/constitution/profile).
export default function ConstitutionPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        {/* The page's heading is the console tab bar's (National settings · Constitution). */}
        <p className="max-w-3xl text-sm text-ink-muted">
          Which version of each part of the constitutional configuration (classification, institutions&apos; standing, who is responsible, offices,
          relationships, the country&apos;s rules) applies together, under which law, from when, and who took each step. Every decision and every read
          of a restricted record records the version in force.
        </p>
        <ConstitutionalProfile />
      </div>
    </CommandShell>
  );
}
