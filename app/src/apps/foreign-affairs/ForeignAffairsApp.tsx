'use client';

// Foreign Affairs sovereign agency app. Federated standing app that
// hosts the four diplomatic surfaces plus a runtime queue for
// diplomatic case-work.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { GeopoliticalCommandCenter } from '@/apps/foreign-affairs/GeopoliticalCommandCenter';
import { DiplomaticMissionsRegister } from '@/apps/foreign-affairs/DiplomaticMissionsRegister';
import { TreatyAlliancesAtlas } from '@/apps/foreign-affairs/TreatyAlliancesAtlas';
import { InternationalCrisisForesight } from '@/apps/foreign-affairs/InternationalCrisisForesight';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = {
  'geopolitical-command': 'incident',
  'diplomatic-missions': 'case',
  'treaties-alliances': 'approval',
  'crisis-foresight': 'incident',
};
const LABEL: Record<string, string> = {
  'geopolitical-command': 'Geopolitical Command Center',
  'diplomatic-missions': 'Diplomatic Missions & Consular Register',
  'treaties-alliances': 'Treaty & Alliances Atlas',
  'crisis-foresight': 'International Crisis & Strategic Foresight',
};

export function ForeignAffairsApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const id = appId;
  const d = WF[domain] ? domain : 'geopolitical-command';
  const label = LABEL[d] ?? LABEL['geopolitical-command']!;
  return (
    <div className="space-y-3 rounded-[3px]" style={{ background: '#040813', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {d === 'geopolitical-command' ? <GeopoliticalCommandCenter id={id} now={now} />
        : d === 'diplomatic-missions' ? <DiplomaticMissionsRegister id={id} now={now} />
          : d === 'treaties-alliances' ? <TreatyAlliancesAtlas id={id} now={now} />
            : <InternationalCrisisForesight id={id} now={now} />}
      <div className="px-3 pb-3">
        <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — diplomatic workflow`} by="Diplomatic Officer" role={role} withheld={withheld} />
      </div>
    </div>
  );
}
