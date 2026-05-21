import { CommandShell } from '@/components/ui/CommandShell';
import { DirectiveBoard } from '@/components/features/DirectiveBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Directive Board' };

export default function DirectivesPage() {
  return (
    <CommandShell active="directives">
      <DirectiveBoard />
    </CommandShell>
  );
}
