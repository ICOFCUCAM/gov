'use client';

import * as React from 'react';

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

  return (
    <div
      role="status"
      className="bg-warn px-4 py-2 text-center text-sm text-ink"
    >
      You're offline. You can keep working — actions are saved and will sync
      when the connection returns.
    </div>
  );
}
