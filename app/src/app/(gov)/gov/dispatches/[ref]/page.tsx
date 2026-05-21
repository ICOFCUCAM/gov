import { CommandShell } from '@/components/ui/CommandShell';
import { DispatchDetail } from '@/components/features/DispatchDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dispatch' };

export default async function DispatchPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <CommandShell active="dispatches">
      <DispatchDetail ref={decodeURIComponent(ref)} />
    </CommandShell>
  );
}
