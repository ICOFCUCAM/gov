'use client';

import * as React from 'react';
import { EncounterThread } from '@/apps/_shared/InstitutionChain';
import { nationMessages } from '@/lib/nation/registry';
import { useRenderNow } from '@/lib/clock/render-now';

// The citizen side of the national support desk — replies from officials
// to agent requests / complaints land here, and the citizen can follow up.
export function SupportThread() {
  const tx = nationMessages().more;
  const [now, setNow] = React.useState(useRenderNow());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <section>
      <h3 className="mb-2 text-lg font-semibold">{tx.supportThread}</h3>
      <EncounterThread
        scope="enc:support:desk"
        now={now}
        accent="#37c7d4"
        selfAuthor="PUBLIC"
        officialName={tx.supportDesk}
        publicName={tx.citizen}
        title={tx.supportTitle}
      />
    </section>
  );
}
