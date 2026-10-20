import { CommandShell } from '@/components/ui/CommandShell';
import { AccessLog } from '@/components/features/AccessLog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Who read what' };

export default function AccessLogPage() {
  return (
    <CommandShell active="aud">
      <AccessLog />
    </CommandShell>
  );
}
