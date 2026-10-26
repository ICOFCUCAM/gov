import { CommandShell } from '@/components/ui/CommandShell';
import { HumanServicesRegister } from '@/components/features/HumanServicesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Social protection' };

export default function SocialProtectionPage() {
  return (
    <CommandShell active="civil">
      <HumanServicesRegister kind="social-protection" />
    </CommandShell>
  );
}
