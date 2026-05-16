import { NextResponse } from 'next/server';
import { listMinistries } from '@/lib/data/store';
import { ministryAppManifest, STANDING_APPS } from '@/apps/manifests';

export const dynamic = 'force-dynamic';

// Authoritative federation view: the server is the source of truth for
// which institutional applications exist and whether they are activated.
// The client orchestration registry reconciles against this.
export function GET() {
  const ministries = listMinistries().filter(m => m.status !== 'merged');
  const ministryApps = ministries.map(m => {
    const mf = ministryAppManifest({ id: m.id, name: m.name, archetype: m.archetype });
    return { ...mf, activated: m.status === 'active', navCount: mf.nav.length };
  });
  const standing = STANDING_APPS.map(a => ({ ...a, activated: true, navCount: a.nav.length }));
  return NextResponse.json({
    apps: [...standing, ...ministryApps],
    stats: {
      registered: standing.length + ministryApps.length,
      activated: standing.length + ministryApps.filter(a => a.activated).length,
    },
  });
}
