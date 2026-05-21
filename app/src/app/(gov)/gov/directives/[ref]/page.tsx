import { CommandShell } from '@/components/ui/CommandShell';
import { DirectiveDetail } from '@/components/features/DirectiveDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Directive' };

export default async function DirectivePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <CommandShell active="directives">
      <DirectiveDetail ref={decodeURIComponent(ref)} />
    </CommandShell>
  );
}
