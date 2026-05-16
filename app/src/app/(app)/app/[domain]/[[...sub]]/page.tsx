import { AppHost } from '@/apps/AppHost';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sovereign Application' };

// Sovereign per-domain routing: /app/<domain> and /app/<domain>/<systemKey>
export default function FederatedAppPage({ params }: { params: { domain: string; sub?: string[] } }) {
  return <AppHost domain={params.domain} initialKey={params.sub?.[0]} />;
}
