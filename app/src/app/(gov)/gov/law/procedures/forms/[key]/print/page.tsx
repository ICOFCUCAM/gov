import { notFound } from 'next/navigation';
import { PrintForm } from '@/components/features/forms/PrintForm';
import { formPage } from '@/lib/forms/page-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Printable form' };

/** The paper form: the same definition, laid out for printing (no console frame). */
export default async function PrintFormPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ version?: string; locale?: string }> }) {
  const { key } = await params;
  const q = await searchParams;
  const page = formPage(decodeURIComponent(key), Number(q.version) || undefined, q.locale);
  if (!page) notFound();
  return (
    <main id="main" className="min-h-screen bg-surface p-4 print:p-0">
      <p className="mb-3 text-xs text-ink-muted print:hidden">Register status: {page.status.label}{page.status.note ? ` · ${page.status.note}` : ''}. Print this page from the browser.</p>
      <PrintForm view={page.view} />
    </main>
  );
}
