import { notFound } from 'next/navigation';
import { CommandShell } from '@/components/ui/CommandShell';
import { FormChannels } from '@/components/features/forms/FormChannels';
import { formPage } from '@/lib/forms/page-data';
import { samplesAllowed } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Form' };

/** One procedure's form (or a library form) in its three channels. */
export default async function FormPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ version?: string; channel?: string; locale?: string }> }) {
  const { key } = await params;
  const q = await searchParams;
  const page = formPage(decodeURIComponent(key), Number(q.version) || undefined, q.locale);
  if (!page) notFound();
  const initial = q.channel === 'assisted' || q.channel === 'paper' || q.channel === 'print' ? q.channel : 'self-service';
  return (
    <CommandShell active="law">
      <FormChannels view={page.view} status={page.status} sample={samplesAllowed()} initial={initial} />
    </CommandShell>
  );
}
