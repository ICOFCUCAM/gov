import { CommandShell } from '@/components/ui/CommandShell';
import { OversightDesk } from '@/components/features/OversightDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Independent oversight' };

export default function OversightPage() {
  return (
    <CommandShell active="aud">
      <OversightDesk />
    </CommandShell>
  );
}
