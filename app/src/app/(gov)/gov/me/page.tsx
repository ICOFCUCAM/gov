import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerProfile } from '@/components/features/OfficerProfile';
import { TwoStepSettings } from '@/components/features/TwoStepSettings';
import { PasswordSettings } from '@/components/features/PasswordSettings';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile' };

export default function MePage() {
  return (
    <CommandShell active="me">
      <TwoStepSettings />
      <PasswordSettings />
      <OfficerProfile />
    </CommandShell>
  );
}
