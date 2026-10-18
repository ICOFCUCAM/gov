import { CommandShell } from '@/components/ui/CommandShell';
import { FieldCapture } from '@/components/features/sites/FieldCapture';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Capture a site' };

export default function CaptureSitePage({ searchParams }: { searchParams: { ministry?: string } }) {
  return (
    <CommandShell active="twin">
      <FieldCapture initialMinistry={typeof searchParams.ministry === 'string' ? searchParams.ministry : undefined} />
    </CommandShell>
  );
}
