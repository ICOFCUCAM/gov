'use client';

// Communications sovereign standing-agency app shell. Hosts four
// digital-infrastructure surfaces plus a runtime queue.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { NationalConnectivityCommand } from '@/apps/communications/NationalConnectivityCommand';
import { CyberSecurityResilience } from '@/apps/communications/CyberSecurityResilience';
import { DigitalIdentitySpectrum } from '@/apps/communications/DigitalIdentitySpectrum';
import { CommsForesightPortal } from '@/apps/communications/CommsForesightPortal';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = {
  'connectivity-command': 'incident',
  'cyber-resilience': 'incident',
  'identity-spectrum': 'permit',
  'foresight-portal': 'approval',
};
const LABEL: Record<string, string> = {
  'connectivity-command': 'National Connectivity Command',
  'cyber-resilience': 'Cybersecurity & Information Resilience',
  'identity-spectrum': 'Digital Identity · Spectrum · Media',
  'foresight-portal': 'Intelligence Forecast & Public Portal',
};

export function CommunicationsApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const id = appId;
  const d = WF[domain] ? domain : 'connectivity-command';
  const label = LABEL[d] ?? LABEL['connectivity-command']!;
  return (
    <div className="space-y-3 rounded-[3px]" style={{ background: '#040813', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {d === 'connectivity-command' ? <NationalConnectivityCommand id={id} now={now} />
        : d === 'cyber-resilience' ? <CyberSecurityResilience id={id} now={now} />
          : d === 'identity-spectrum' ? <DigitalIdentitySpectrum id={id} now={now} />
            : <CommsForesightPortal id={id} now={now} />}
      <div className="px-3 pb-3">
        <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the communications workflow`} by="Network Officer" role={role} withheld={withheld} />
      </div>
    </div>
  );
}
