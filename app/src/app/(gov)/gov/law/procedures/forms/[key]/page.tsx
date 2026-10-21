import { notFound } from 'next/navigation';
import { CommandShell } from '@/components/ui/CommandShell';
import { FormChannels } from '@/components/features/forms/FormChannels';
import { LibraryDetails } from '@/components/features/forms/LibraryDetails';
import { PublicationPanel } from '@/components/features/forms/PublicationPanel';
import { AmbiguousForm, CatalogueEntryView } from '@/components/features/forms/CatalogueEntry';
import { formPage } from '@/lib/forms/page-data';
import { samplesAllowed } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Form' };

/** One procedure's form (or a library form) in its three channels, with what it is and its publication gates. */
export default async function FormPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ version?: string; channel?: string; locale?: string }> }) {
  const { key } = await params;
  const q = await searchParams;
  const page = formPage(decodeURIComponent(key), Number(q.version) || undefined, q.locale);
  if (!page) notFound();
  // A bare ID more than one catalogue uses is refused with its candidates; a catalogue entry with no contract shows its scope.
  if ('ambiguous' in page || 'entry' in page) {
    return (
      <CommandShell active="law">
        <div className="space-y-4 px-4 py-6">{'ambiguous' in page ? <AmbiguousForm ambiguous={page.ambiguous} /> : <CatalogueEntryView entry={page.entry} />}</div>
      </CommandShell>
    );
  }
  const initial = q.channel === 'assisted' || q.channel === 'paper' || q.channel === 'print' ? q.channel : 'self-service';
  return (
    <CommandShell active="law">
      <FormChannels view={page.view} status={page.status} sample={samplesAllowed()} initial={initial} />
      <div className="space-y-4 px-4 pb-6">
        {page.library ? <LibraryDetails title={page.view.procedure.title} library={page.library} /> : null}
        <section id="publication" aria-label="Publication">
          <PublicationPanel pkgKey={page.view.procedure.key} version={page.view.procedure.version} />
        </section>
      </div>
    </CommandShell>
  );
}
