import { CommandShell } from '@/components/ui/CommandShell';
import { DirectiveInbox } from '@/components/features/DirectiveInbox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Directive inbox' };

export default function InboxPage() {
  return (
    <CommandShell active="inbox">
      <DirectiveInbox />
    </CommandShell>
  );
}
