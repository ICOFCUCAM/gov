import { CommandShell } from '@/components/ui/CommandShell';
import { BillsWorkspace } from '@/components/features/LegislativeRecord';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bills and votes' };

// The legislature's own record, kept by its clerk (plan phase 7; guidance §2.3, §6.2): /api/legislature.
export default function LegislaturePage() {
  return (
    <CommandShell active="branches">
      <div className="space-y-6 p-4">
        <p className="max-w-3xl text-sm text-ink-muted">
          The bills before the legislature and the acts it passed, as its clerk keeps them: every version of the text,
          each stage, the votes, committee reports, assent and publication. Only the legislature&apos;s own officials write
          this record; nobody serving the government can change it, and a correction keeps the earlier version.
        </p>
        <BillsWorkspace />
      </div>
    </CommandShell>
  );
}
