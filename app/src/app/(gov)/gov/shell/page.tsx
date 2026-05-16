import { CommandShell } from '@/components/ui/CommandShell';
import { NationalShell } from '@/components/features/NationalShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Shell' };

export default function NationalShellPage() {
  return (
    <CommandShell active="shell">
      <NationalShell />
    </CommandShell>
  );
}
