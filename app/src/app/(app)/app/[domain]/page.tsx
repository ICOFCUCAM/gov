import { AppHost } from '@/apps/AppHost';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sovereign Application' };

export default function FederatedAppPage({ params }: { params: { domain: string } }) {
  return <AppHost domain={params.domain} />;
}
