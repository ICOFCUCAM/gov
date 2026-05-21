import { CommandShell } from '@/components/ui/CommandShell';
import { ServiceRequestDetail } from '@/components/features/ServiceRequestDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Service request' };

export default async function ServiceRequestPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <CommandShell active="intake">
      <ServiceRequestDetail ref={decodeURIComponent(ref)} />
    </CommandShell>
  );
}
