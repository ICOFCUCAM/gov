import { CommandShell } from '@/components/ui/CommandShell';
import { HealthRegulation } from '@/components/features/HealthRegulation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Health regulation' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <HealthRegulation />
    </CommandShell>
  );
}
