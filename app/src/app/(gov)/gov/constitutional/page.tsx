import { CommandShell } from '@/components/ui/CommandShell';
import { ConstitutionalDesk } from '@/components/features/ConstitutionalDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Constitutional desk' };

export default function ConstitutionalPage() {
  return (
    <CommandShell active="constitutional">
      <ConstitutionalDesk />
    </CommandShell>
  );
}
