'use client';

import * as React from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // Surface to the console; a real deployment would ship this to an
    // observability sink. No citizen data is included in error payloads.
    console.error('[CivicOS] surface error', error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#05070b] px-6 text-[#c5d2df]">
      <div className="w-full max-w-md rounded-[3px] border border-[#3a2530] bg-[#0c0f14] p-6"
        style={{ boxShadow: '0 0 24px rgba(241,112,122,0.12)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#f1707a]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#f1707a]">
            Surface fault · contained
          </span>
        </div>
        <h1 className="mt-3 text-lg font-semibold text-[#e6edf4]">This command surface failed to render.</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7d8b9c]">
          The fault is isolated to this view — other surfaces and the audit
          chain are unaffected. Retry, or return to the command center.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-[#5b6b7d]">ref {error.digest}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button onClick={reset}
            className="rounded-[3px] border border-[#37c7d4] px-3 py-1.5 text-[12px] font-medium text-[#37c7d4] transition-colors hover:bg-[#37c7d4]/10">
            Retry surface
          </button>
          <Link href="/"
            className="rounded-[3px] border border-[#1c2733] px-3 py-1.5 text-[12px] text-[#9fb2c4] no-underline transition-colors hover:text-[#e6edf4]">
            Command center →
          </Link>
        </div>
      </div>
    </div>
  );
}
