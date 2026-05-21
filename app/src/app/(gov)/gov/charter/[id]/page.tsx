import { CommandShell } from '@/components/ui/CommandShell';
import { CharterDetail } from '@/components/features/CharterDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Charter' };

export default async function CharterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CommandShell active="charter">
      <CharterDetail charterId={decodeURIComponent(id)} />
    </CommandShell>
  );
}
