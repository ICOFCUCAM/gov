import { AppHost } from '@/apps/AppHost';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ domain: string }> }) {
  const params = await props.params;
  return { title: `${params.domain}.gov · Sovereign Application` };
}

// Sovereign per-domain routing: /app/<domain> and /app/<domain>/<systemKey>
export default async function FederatedAppPage(props: { params: Promise<{ domain: string; sub?: string[] }> }) {
  const params = await props.params;
  return <AppHost domain={params.domain} initialKey={params.sub?.[0]} />;
}
