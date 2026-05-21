import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerHome } from '@/components/features/OfficerHome';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Officer Home' };

export default function OfficerHomePage() {
  return (
    <CommandShell active="home">
      <OfficerHome />
    </CommandShell>
  );
}
