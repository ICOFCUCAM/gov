import { CommandShell } from '@/components/ui/CommandShell';
import { PostureBoard } from '@/components/features/PostureBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Posture Board' };

export default function PosturePage() {
  return (
    <CommandShell active="posture">
      <PostureBoard />
    </CommandShell>
  );
}
