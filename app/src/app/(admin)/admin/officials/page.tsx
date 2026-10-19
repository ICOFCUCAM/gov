import { CommandShell } from '@/components/ui/CommandShell';
import { OfficialAccounts } from '@/components/features/OfficialAccounts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Official accounts' };

// Platform accounts for officials (lib/auth/officials.ts): who can sign in on
// this installation when the substrate is not connected. Behind sign-in.
export default function OfficialAccountsPage() {
  return (
    <CommandShell active="officials">
      <OfficialAccounts />
    </CommandShell>
  );
}
