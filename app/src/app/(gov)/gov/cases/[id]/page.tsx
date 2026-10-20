import { CommandShell } from '@/components/ui/CommandShell';
import { CaseFile } from '@/components/features/CaseFile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Case' };

export default async function CasePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <CommandShell active="work">
      <CaseFile id={id} />
    </CommandShell>
  );
}
