'use client';

import * as React from 'react';
import { StateNotice } from '@/components/ui/States';

/**
 * Connectivity-aware banner. Low-connectivity is the norm in many
 * deployments; the operator/citizen must always know whether their actions
 * are syncing or queued. Non-blocking, polite.
 */
export function OfflineBanner() {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  // The shared offline state (plan I10): ink on the surface with the warning
  // edge, word and shape; the earlier ink on a warn fill read below 4.5:1.
  return (
    <StateNotice state="offline" title="You're offline." className="rounded-none border-x-0 text-center">
      You can keep working — actions are saved and will sync when the connection returns.
    </StateNotice>
  );
}
