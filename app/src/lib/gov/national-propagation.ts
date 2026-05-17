// National Propagation Engine.
//
// Sovereign events do not stay inside one institution: a Health-origin
// shock cascades through the federation — Laboratory → Disease
// Intelligence → Emergency Command → Border Control → Treasury
// Procurement → National Security → Cabinet. This engine models that
// living cascade: per-hop signal, decaying/amplified magnitude, cumulative
// arrival time, status and a recommended institutional action, plus the
// national escalation it forces. Pure & deterministic; no React/DOM.

import { wave } from '@/lib/telemetry';

export type PropagationTrigger =
  | 'outbreak'
  | 'mass-casualty'
  | 'drug-shortage'
  | 'capacity-collapse';

export interface PropagationInput {
  trigger: PropagationTrigger;
  /** 0-100 origin severity */
  severity: number;
  originRegion: string;
}

export interface PropagationHop {
  order: number;
  institution: string;
  signal: string;
  /** 0-100 magnitude arriving at this node (decays/amplifies along the chain) */
  magnitude: number;
  /** cumulative hours from origin to this node */
  etaHrs: number;
  status: 'origin' | 'active' | 'inbound' | 'latent';
  action: string;
  amplified: boolean;
  tone: 'ok' | 'warn' | 'alert';
}

export interface NationalPropagation {
  trigger: PropagationTrigger;
  label: string;
  hops: PropagationHop[];
  reach: number;                 // institutions the cascade has activated
  terminalMagnitude: number;     // magnitude at the last reached node
  escalation: 'monitor' | 'coordinate' | 'mobilise' | 'cabinet';
  containmentWindowHrs: number;  // hours before cabinet-tier escalation is forced
  recommended: string[];
}

interface ChainNode { institution: string; signal: string; action: string; amplifies?: boolean; hopHrs: number }

const CHAINS: Record<PropagationTrigger, { label: string; nodes: ChainNode[] }> = {
  outbreak: {
    label: 'Pathogen outbreak cascade',
    nodes: [
      { institution: 'Laboratory', signal: 'Confirmed positive cluster', action: 'Sequence & confirm index cases', hopHrs: 0 },
      { institution: 'Disease Intelligence', signal: 'Epidemic signal', action: 'Model spread · issue Rt projection', amplifies: true, hopHrs: 3 },
      { institution: 'Emergency Command', signal: 'Surge advisory', action: 'Pre-position response & isolation capacity', hopHrs: 4 },
      { institution: 'Border Control', signal: 'Entry-screening directive', action: 'Activate port-of-entry screening', hopHrs: 6 },
      { institution: 'Treasury Procurement', signal: 'Emergency funding request', action: 'Release contingency procurement line', hopHrs: 8 },
      { institution: 'National Security', signal: 'Bio-threat assessment', action: 'Assess containment & continuity risk', hopHrs: 12 },
      { institution: 'Cabinet', signal: 'National escalation', action: 'Convene emergency cabinet cell', amplifies: true, hopHrs: 18 },
    ],
  },
  'mass-casualty': {
    label: 'Mass-casualty cascade',
    nodes: [
      { institution: 'Emergency Command', signal: 'MCI declared', action: 'Activate mass-casualty plan', hopHrs: 0 },
      { institution: 'Hospital Network', signal: 'Trauma surge', action: 'Open surge beds · divert non-critical', amplifies: true, hopHrs: 1 },
      { institution: 'Doctor Systems', signal: 'Clinician recall', action: 'Recall on-call & trauma teams', hopHrs: 2 },
      { institution: 'Pharmaceutical', signal: 'Blood & resus demand', action: 'Release emergency stock & blood', hopHrs: 3 },
      { institution: 'Treasury Procurement', signal: 'Emergency authorisation', action: 'Authorise emergency expenditure', hopHrs: 6 },
      { institution: 'Cabinet', signal: 'National coordination', action: 'National disaster coordination', hopHrs: 10 },
    ],
  },
  'drug-shortage': {
    label: 'Pharmaceutical shortage cascade',
    nodes: [
      { institution: 'Pharmaceutical', signal: 'Critical depletion', action: 'Trigger national redistribution', hopHrs: 0 },
      { institution: 'Treasury Procurement', signal: 'Expedited procurement', action: 'Fast-track emergency tender', amplifies: true, hopHrs: 6 },
      { institution: 'Customs', signal: 'Priority clearance', action: 'Green-lane medical imports', hopHrs: 10 },
      { institution: 'Hospital Network', signal: 'Rationing protocol', action: 'Apply clinical rationing guidance', hopHrs: 14 },
      { institution: 'Cabinet', signal: 'Supply-security review', action: 'Escalate supply-security review', hopHrs: 24 },
    ],
  },
  'capacity-collapse': {
    label: 'Hospital capacity-collapse cascade',
    nodes: [
      { institution: 'Hospital Network', signal: 'Capacity exhausted', action: 'Declare divert · open all surge', hopHrs: 0 },
      { institution: 'Emergency Command', signal: 'Routing failure', action: 'Re-route to regional capacity', amplifies: true, hopHrs: 1 },
      { institution: 'Health Command', signal: 'National capacity alert', action: 'Coordinate inter-region transfers', hopHrs: 3 },
      { institution: 'Treasury Procurement', signal: 'Surge funding', action: 'Fund field-hospital activation', hopHrs: 8 },
      { institution: 'Cabinet', signal: 'Continuity escalation', action: 'Convene continuity-of-care cell', hopHrs: 16 },
    ],
  },
};

const DECAY = 0.86;          // base magnitude retained per hop
const AMPLIFY = 1.22;        // amplifier-node boost

export function propagateNationalEvent(i: PropagationInput, t: number): NationalPropagation {
  const chain = CHAINS[i.trigger];
  // Deterministic "live" jitter so the cascade breathes without being random.
  const sev = Math.max(0, Math.min(100, i.severity));
  let mag = sev;
  let cumHrs = 0;
  const hops: PropagationHop[] = chain.nodes.map((n, idx): PropagationHop => {
    cumHrs += n.hopHrs;
    if (idx > 0) {
      mag = mag * (n.amplifies ? AMPLIFY : DECAY);
      // bounded deterministic breathing keyed by node + time
      mag += wave(`np:${i.trigger}:${idx}`, t, -4, 4);
    }
    mag = Math.max(0, Math.min(100, Math.round(mag)));
    // A node is active once the cascade front (severity-paced) has reached it.
    const front = (sev / 100) * 36; // higher severity → faster, deeper reach
    const status: PropagationHop['status'] =
      idx === 0 ? 'origin'
        : cumHrs <= front ? 'active'
          : cumHrs <= front + 6 ? 'inbound' : 'latent';
    const tone: PropagationHop['tone'] =
      mag >= 65 ? 'alert' : mag >= 38 ? 'warn' : 'ok';
    return {
      order: idx,
      institution: n.institution,
      signal: n.signal,
      magnitude: mag,
      etaHrs: cumHrs,
      status,
      action: n.action,
      amplified: !!n.amplifies && idx > 0,
      tone,
    };
  });
  const reached = hops.filter(h => h.status === 'origin' || h.status === 'active');
  const reach = reached.length;
  const terminalMagnitude = reached.length ? reached[reached.length - 1]!.magnitude : sev;
  const cabinetHop = hops.find(h => h.institution === 'Cabinet');
  const cabinetActive = cabinetHop?.status === 'active';
  const escalation: NationalPropagation['escalation'] =
    cabinetActive || terminalMagnitude >= 70 ? 'cabinet'
      : reach >= 4 || terminalMagnitude >= 50 ? 'mobilise'
        : reach >= 2 || terminalMagnitude >= 30 ? 'coordinate' : 'monitor';
  const containmentWindowHrs = Math.max(0, (cabinetHop?.etaHrs ?? 24) - hops[Math.max(0, reach - 1)]!.etaHrs);
  const recommended: string[] = [];
  const front = reached[reached.length - 1];
  if (front && front.order < hops.length - 1) {
    recommended.push(`Pre-empt ${hops[front.order + 1]!.institution}: ${hops[front.order + 1]!.action}`);
  }
  if (escalation === 'cabinet') recommended.push('Brief Cabinet now — terminal magnitude exceeds national threshold');
  else if (escalation === 'mobilise') recommended.push('Mobilise cross-institution response before cabinet-tier window closes');
  if (hops.some(h => h.amplified && (h.status === 'active' || h.status === 'inbound'))) {
    recommended.push(`Dampen amplifier node — ${hops.find(h => h.amplified)!.institution} is escalating magnitude`);
  }
  if (recommended.length === 0) recommended.push('Maintain surveillance — cascade contained within origin institution');

  return {
    trigger: i.trigger,
    label: chain.label,
    hops,
    reach,
    terminalMagnitude,
    escalation,
    containmentWindowHrs,
    recommended,
  };
}
