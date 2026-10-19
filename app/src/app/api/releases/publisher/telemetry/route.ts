// /api/releases/publisher/telemetry — the operational data the publisher has
// actually received, per nation and category. Only categories a nation has
// enabled ever appear; for the rest the publisher sees that they are off.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { publisherOverview } from '@/lib/data/updates';
import { CATEGORY_KEYS, received, sharing } from '@/lib/data/sovereignty';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const nations = publisherOverview().nations.map(n => {
    const st = sharing(n.id);
    // The publisher sees whether each category is shared and what arrived — never the local held-back counts.
    return { id: n.id, name: n.name, categories: Object.fromEntries(CATEGORY_KEYS.map(k => { const s = st.find(x => x.category === k)!; return [k, { shared: s.enabled, received: received({ nationId: n.id, category: k }).length, lastAt: s.enabled ? s.lastSentAt : undefined }]; })) };
  });
  return NextResponse.json({ nations, recent: received().slice(0, 40) });
}
