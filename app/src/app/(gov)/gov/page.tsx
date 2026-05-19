import { ExecutiveOverview } from '@/components/features/ExecutiveOverview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Executive Overview' };


// Flagship executive surface — self-contained command chrome, no AppShell.
export default function CabinetPage() {
  return <ExecutiveOverview />;
}
