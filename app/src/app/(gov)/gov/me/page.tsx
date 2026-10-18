import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerProfile } from '@/components/features/OfficerProfile';
import { TwoStepSettings } from '@/components/features/TwoStepSettings';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile' };

export default function MePage() {
  return (
    <CommandShell active="me">
      <TwoStepSettings />
      <OfficerProfile />
    </CommandShell>
  );
}
