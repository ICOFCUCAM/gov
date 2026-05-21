import { CommandShell } from '@/components/ui/CommandShell';
import { FederationStream } from '@/components/features/FederationStream';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Federation Stream' };

export default function FederationPage() {
  return (
    <CommandShell active="federation">
      <FederationStream />
    </CommandShell>
  );
}
