import { CommandShell } from '@/components/ui/CommandShell';
import { AppealDetail } from '@/components/features/AppealDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Appeal' };

export default async function AppealPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <CommandShell active="intake">
      <AppealDetail ref={decodeURIComponent(ref)} />
    </CommandShell>
  );
}
