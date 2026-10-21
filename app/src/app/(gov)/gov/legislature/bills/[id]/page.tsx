import { CommandShell } from '@/components/ui/CommandShell';
import { BillRecord } from '@/components/features/LegislativeRecord';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bill' };

// One bill of the legislature's record (plan phase 7): versions, stages, votes, committee reports, the clerk's certification.
export default async function BillPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <CommandShell active="branches">
      <div className="p-4">
        <BillRecord id={decodeURIComponent(id)} />
      </div>
    </CommandShell>
  );
}
