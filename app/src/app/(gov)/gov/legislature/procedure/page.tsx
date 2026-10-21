import { CommandShell } from '@/components/ui/CommandShell';
import { LegislativeProcedurePanel } from '@/components/features/LegislativeRecord';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Legislative procedure' };

// The nation's legislative procedure (plan phase 7): drafted by one official of the legislature, approved by another.
export default function LegislativeProcedurePage() {
  return (
    <CommandShell active="branches">
      <div className="space-y-6 p-4">
        <p className="max-w-3xl text-sm text-ink-muted">
          The stages a bill goes through, how votes are counted and whether members&apos; names are recorded, whether assent
          is needed and what the public sees, in the words of the legislature&apos;s standing orders. The platform ships a
          reference only; the legislature drafts its own and a second official who can sign there approves it.
        </p>
        <LegislativeProcedurePanel />
      </div>
    </CommandShell>
  );
}
