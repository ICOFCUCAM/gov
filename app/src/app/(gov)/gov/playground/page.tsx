import { CommandShell } from '@/components/ui/CommandShell';
import { SubstratePlayground } from '@/components/features/SubstratePlayground';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Substrate playground' };

export default function PlaygroundPage() {
  return (
    <CommandShell active="playground">
      <SubstratePlayground />
    </CommandShell>
  );
}
