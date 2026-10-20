// /api/law — the laws register (lib/law/register.ts, design §5).
// GET: the instruments (signed-in officials see recorded and withdrawn
// versions too; everyone else only confirmed ones). POST: record a new version
// (and the instrument, the first time), typed in as provisions or read from
// an Akoma Ntoso or CSV file; officials of the law-register authority
// (canRecordLaw()). A different official confirms it (/api/law/confirm).
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { caseScope, refusal, withOfficial } from '@/lib/auth/official';
import { canRecordLaw } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { listInstruments, recordVersion, type RecordInput } from '@/lib/law/register';
import { readAkomaNtoso, readProvisionsCsv } from '@/lib/law/akoma-ntoso';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const official = await caseScope();
  const list = listInstruments({ type: q.get('type') ?? undefined, q: q.get('q') ?? undefined, state: official ? 'any' : 'confirmed' });
  const instruments = official ? list : list.map(i => ({ ...i, versions: i.versions.filter(v => v.state === 'confirmed') }));
  return NextResponse.json({ instruments, authority: authorityFor('lawRegister') ?? null });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canRecordLaw(s, authorityFor('lawRegister')));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as RecordInput & { by?: string; format?: 'akoma-ntoso' | 'csv'; text?: string };
  const who = await caseScope();
  let input: RecordInput = b;
  if (b.format) {
    if (typeof b.text !== 'string') return NextResponse.json({ error: 'Send the file\'s text' }, { status: 422 });
    const read = b.format === 'akoma-ntoso' ? readAkomaNtoso(b.text) : readProvisionsCsv(b.text);
    if ('error' in read) return NextResponse.json(read, { status: 422 });
    const sha256 = createHash('sha256').update(b.text, 'utf8').digest('hex');
    input = { ...b, provisions: read.provisions, instrument: { ...(read.work?.title ? { title: read.work.title } : {}), ...b.instrument }, source: { kind: b.format, sha256 } };
  }
  const r = recordVersion(input, who?.label ?? b.by ?? 'Unverified official', who?.id);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r, { status: 201 });
}
