import { CommandShell } from '@/components/ui/CommandShell';
import { PublicHealthProgrammes } from '@/components/features/PublicHealthProgrammes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public health and workforce' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <PublicHealthProgrammes />
    </CommandShell>
  );
}
