// Plan I9 (federation and portability): the per-endpoint API contract by family, generated from the route files.
import { CommandShell } from '@/components/ui/CommandShell';
import { ApiContract } from '@/components/features/exchange/ApiContract';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'API contract' };

export default async function Page(props: { searchParams: Promise<{ family?: string }> }) {
  const { family } = await props.searchParams;
  return (
    <CommandShell active="intg">
      <ApiContract {...(family ? { family } : {})} />
    </CommandShell>
  );
}
