import { CommandShell } from '@/components/ui/CommandShell';
import { FieldCapture } from '@/components/features/sites/FieldCapture';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Capture a site' };

export default async function CaptureSitePage(props: { searchParams: Promise<{ ministry?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <CommandShell active="twin">
      <FieldCapture initialMinistry={typeof searchParams.ministry === 'string' ? searchParams.ministry : undefined} />
    </CommandShell>
  );
}
