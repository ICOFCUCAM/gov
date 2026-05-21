import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerDetail } from '@/components/features/OfficerDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Officer' };

export default async function OfficerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CommandShell active="officers">
      <OfficerDetail id={decodeURIComponent(id)} />
    </CommandShell>
  );
}
