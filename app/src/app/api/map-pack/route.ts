// District shapes for the installed nation (lib/data/map-pack.ts): GET says
// whether districts are bundled, installed (source, date, by whom) or missing;
// POST, by an administrator: { action: 'install', adm? } downloads them from
// geoBoundaries, { action: 'upload', text, metaText? | source, licence, year, adm }
// installs an uploaded geoBoundaries file, { action: 'remove', reason? }
// returns the maps to the bundled districts (or none).
import { NextRequest, NextResponse } from 'next/server';
import { districtPackStatus, installDistrictsFromFile, installDistrictsFromGeoBoundaries, removeInstalledDistricts, MAX_PACK_BYTES } from '@/lib/data/map-pack';
import { readJson, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
import { refusal, withOfficial } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { limit } from '@/lib/ops/rate-limit';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await districtPackStatus());
}

export async function POST(req: NextRequest) {
  const limited = await limit(req, 'upload');
  if (limited) return limited;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  // Read with a byte cap (lib/net/body-limit.ts, review L-4): an uploaded pack (MAX_PACK_BYTES) and its
  // metadata as JSON strings, escaping included.
  const body = await readJson(req, 2 * MAX_PACK_BYTES + 1_000_000);
  if (body === TOO_LARGE) return tooLargeAnswer(MAX_PACK_BYTES, 'The file');
  const b = (await withOfficial(body && typeof body === 'object' ? body : {})) as Record<string, unknown> & { by?: string };
  const str = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : undefined);
  const by = b.by ?? '';
  const r = b.action === 'install' ? await installDistrictsFromGeoBoundaries(by, { adm: str('adm') })
    : b.action === 'upload' ? await installDistrictsFromFile({ text: str('text') ?? '', metaText: str('metaText'), source: str('source'), licence: str('licence'), year: str('year'), adm: str('adm') }, by)
    : b.action === 'remove' ? removeInstalledDistricts(by, str('reason'))
    : { error: 'Say what to do: install, upload or remove' };
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(await districtPackStatus(), { status: b.action === 'remove' ? 200 : 201 });
}
