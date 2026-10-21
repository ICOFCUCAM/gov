import { CommandShell } from '@/components/ui/CommandShell';
import { TransitionsRegister } from '@/components/features/TransitionsRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transitions and emergencies' };

// Transitions and emergencies (plan phase 6; guidance §4): acting appointments,
// delegations, successions, caretaker periods, dissolutions, impeachment
// stages, courts' rulings, states of emergency, powers moved between national
// and regional institutions and declarations of interest, each recorded by one
// official citing the law and confirmed by another (/api/constitution/transitions).
export default function TransitionsPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        {/* The page's heading is the console tab bar's (National settings · Transitions). */}
        <p className="max-w-3xl text-sm text-ink-muted">
          Who acts in an office and until when, who has stepped aside from a case, which government is in a caretaker period, where a state of
          emergency applies and when it expires, what a court ruled about a law, and which powers moved between national and regional institutions.
          Each is a legal event the nation&apos;s law provides for, recorded with its law and confirmed by a second official.
        </p>
        <TransitionsRegister />
      </div>
    </CommandShell>
  );
}
