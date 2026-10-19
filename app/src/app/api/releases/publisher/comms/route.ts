// /api/releases/publisher/comms — release communication: which releases are
// translated into the languages of enrolled nations (GET); add a translation
// or a training / guide link to a release (POST). Audited.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { allReleases, nationRecord, publisherOverview } from '@/lib/data/updates';
import { addResource, addTranslation, releaseResources, translationCoverage } from '@/lib/data/comms';
import { nationLanguage } from '@/lib/updates/language';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const nations = publisherOverview().nations.map(n => ({ id: n.id, name: n.name, language: nationLanguage(nationRecord(n.id)!) }));
  const locales = [...new Set(['sw', 'fr', 'ar', ...nations.map(n => n.language)])].filter(l => l !== 'en');
  const releases = allReleases().sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  return NextResponse.json({
    nations, locales,
    releases: releases.map(r => ({ id: r.id, version: r.version, title: r.title, changes: r.changes.length, resources: releaseResources(r).length })),
    coverage: translationCoverage(releases.map(r => r.id), locales),
  });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; releaseId?: string; locale?: string; summary?: string; changes?: string[]; kind?: string; title?: string; url?: string; language?: string; by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const r = allReleases().find(x => x.id === b.releaseId);
  if (!r) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  const out = b.action === 'translate' ? addTranslation(r, b) : b.action === 'resource' ? addResource(r, b) : { error: 'action must be translate or resource', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true });
}
