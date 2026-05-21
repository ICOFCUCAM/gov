import { CommandShell } from '@/components/ui/CommandShell';
import { KeyboardShortcuts } from '@/components/features/KeyboardShortcuts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Help' };

export default function HelpPage() {
  return (
    <CommandShell active="help">
      <KeyboardShortcuts />
    </CommandShell>
  );
}
