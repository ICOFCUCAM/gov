'use client';

import * as React from 'react';
import { EncounterThread } from '@/apps/_shared/InstitutionChain';

// The citizen side of the national support desk — replies from officials
// to agent requests / complaints land here, and the citizen can follow up.
export function SupportThread() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <section>
      <h3 className="mb-2 text-lg font-semibold">Support thread</h3>
      <EncounterThread
        scope="enc:support:desk"
        now={now}
        accent="#37c7d4"
        selfAuthor="PUBLIC"
        officialName="Citizen support desk"
        publicName="Citizen"
        title="Your conversation with the support desk"
      />
    </section>
  );
}
