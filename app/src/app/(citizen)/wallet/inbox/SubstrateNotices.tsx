'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { myNotifications, type CitizenNotification } from '@/lib/db/repos/citizen';

const ACTION_HREF: Record<CitizenNotification['action'], string> = {
  rate: '/wallet/substrate',
  view: '/wallet/substrate',
  extend: '/wallet/home',
};

/**
 * SubstrateNotices — the real "needs your attention" feed for the signed-in
 * citizen, read from civicos_my_notifications (auth.uid()-scoped). Sits in
 * the wallet inbox alongside the demo support thread; renders nothing when
 * there's no substrate, no session, or nothing actionable.
 */
export function SubstrateNotices() {
  const { actor, ready } = useIdentity();
  const [items, setItems] = React.useState<CitizenNotification[]>([]);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready || actor?.kind !== 'citizen') { setItems([]); return; }
    void myNotifications(30).then(setItems);
  }, [available, ready, actor?.kind]);

  if (items.length === 0) return null;

  return (
    <section className="mb-4">
      <h3 className="font-semibold text-lg mb-2">From the substrate</h3>
      <div className="space-y-2">
        {items.map((n, i) => (
          <Link key={`${n.kind}:${n.ref}:${i}`} href={ACTION_HREF[n.action]} className="block">
            <Card tight>
              <div className="flex items-center gap-2">
                <strong className="min-w-0 flex-1 truncate">{n.detail}</strong>
                <Pill tone={n.kind === 'consent_expiring' ? 'warn' : undefined}>{n.action}</Pill>
              </div>
              <div className="font-mono text-xs text-ink-muted">{n.ref}</div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
