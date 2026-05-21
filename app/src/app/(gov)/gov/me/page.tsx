import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerProfile } from '@/components/features/OfficerProfile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile' };

export default function MePage() {
  return (
    <CommandShell active="me">
      <OfficerProfile />
    </CommandShell>
  );
}
