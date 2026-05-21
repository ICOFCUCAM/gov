import { CommandShell } from '@/components/ui/CommandShell';
import { WorkItemDetail } from '@/components/features/WorkItemDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Work Item' };

export default async function ItemPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <CommandShell active="items">
      <WorkItemDetail ref={decodeURIComponent(ref)} />
    </CommandShell>
  );
}
