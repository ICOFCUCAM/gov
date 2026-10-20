import { CommandShell } from '@/components/ui/CommandShell';
import { ResponsibleAuthorities } from '@/components/features/ResponsibleAuthorities';
import { RegisterOwners } from '@/components/features/RegisterOwners';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Who is responsible' };

// Who is responsible for each register, on its own page (wiring audit §4,
// §15): the same editor National settings carries (ResponsibleAuthorities,
// saved through /api/sovereign by administrators), and beside it who keeps
// each register and how it is changed (GET /api/platform/owners, read only).
export default function ResponsibleAuthoritiesPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        {/* The page's heading is the console tab bar's (National settings · Who is responsible). */}
        <p className="max-w-3xl text-sm text-ink-muted">
          The institution legally responsible for each register and power, and where each register&apos;s one authoritative record is kept.
          Cases and registers refuse work until their institution is named here.
        </p>
        <ResponsibleAuthorities />
        <RegisterOwners />
      </div>
    </CommandShell>
  );
}
