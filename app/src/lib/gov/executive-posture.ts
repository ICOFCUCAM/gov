// How the executive screens (the Command Center, the console header strip and
// its crisis banner) show the national posture without inventing one.
//
// The server decides what the posture rests on (lib/data/store/national.ts):
// in a production installation only recorded incidents and real queue items;
// in demo and training also the generated pressure model. This module turns
// that into the words, tones and markers the screens show, so a production
// installation never reads "National risk CRITICAL" with nothing recorded, a
// "0 serious incidents … cabinet coordination advised" banner, generated
// separation-of-powers percentages or a readiness level nobody measured.
// Pure: no imports from the browser or the stores.

import type { NationalCoordination, NationalSnapshot } from '@/lib/api/types';
import { REFERENCE_MODEL, type SignalKind } from '@/lib/twin/signal';

export type Tone = 'ok' | 'warn' | 'alert' | 'neutral';

export interface PostureFigure {
  /** The word or number shown. */
  v: string;
  t: Tone;
  kind: SignalKind;
  src: string;
}

export interface ExecutivePosture {
  /** Whether this installation may show sample figures (false in production, and until the snapshot has loaded). */
  samples: boolean;
  /** Whether the snapshot and posture have loaded. */
  loaded: boolean;
  risk: PostureFigure;
  readiness: PostureFigure;
  incidents: PostureFigure;
  queues: PostureFigure;
  /** Crisis banner: shown only when the recorded (or, in demo, sample) data calls for it. */
  banner: { show: boolean; text: string; kind: SignalKind; src: string };
  /** Generated indicators with no record behind them (separation of powers, branch readiness, system integrity, revenue): shown only as samples. */
  generated: { show: boolean; kind: SignalKind; src: string };
}

const NOT_CONNECTED = 'Not connected';

export function executivePosture(nat: NationalSnapshot | null, coord: NationalCoordination | null): ExecutivePosture {
  const loaded = !!nat && !!coord;
  // Unknown until the snapshot says so: show nothing generated meanwhile.
  const samples = nat?.samples ?? false;
  const posture = coord?.posture;
  // A posture without a basis comes from a server before this change: it was generated.
  const basis = posture?.basis ?? 'sample';
  const sampleBasis = basis === 'sample';
  const postureKind: SignalKind = sampleBasis ? 'sample' : 'record';
  const postureSrc = posture?.source ?? `Posture computed from seeded incidents · ${REFERENCE_MODEL}`;
  const incidents = nat?.crossMinistryIncidents ?? [];
  const crit = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  const level: Tone = (posture?.level as Tone | undefined) ?? 'ok';

  const risk: PostureFigure = !loaded
    ? { v: '—', t: 'neutral', kind: 'unavailable', src: 'Loading the national posture' }
    : !samples && sampleBasis
      // A production installation never shows a generated posture, whatever the server sent.
      ? { v: NOT_CONNECTED, t: 'neutral', kind: 'unavailable', src: 'No recorded basis for a national posture' }
      : { v: posture!.label, t: level, kind: postureKind, src: postureSrc };

  // Readiness is not measured by any record: a sample in demo and training, not connected in production.
  const readiness: PostureFigure = loaded && samples
    ? { v: level === 'alert' ? 'CRITICAL' : level === 'warn' ? 'ELEVATED' : 'OPERATIONAL', t: level, kind: 'sample', src: `Readiness read from the sample posture · ${REFERENCE_MODEL}` }
    : { v: NOT_CONNECTED, t: 'neutral', kind: 'unavailable', src: 'No readiness source connected; nothing on this installation measures national readiness' };

  const incidentsFig: PostureFigure = {
    v: nat ? String(incidents.length) : '—',
    t: incidents.length ? 'alert' : 'ok',
    kind: samples ? 'sample' : 'record',
    src: samples ? `Seeded ministry incidents · ${REFERENCE_MODEL}` : 'Ministry incidents recorded by officials',
  };
  const breaching = nat?.totals.queuesBreaching ?? 0;
  const queues: PostureFigure = {
    v: nat ? String(breaching) : '—',
    t: breaching > 0 ? 'warn' : 'ok',
    kind: samples ? 'sample' : 'record',
    src: samples ? `Seeded ministry queues · ${REFERENCE_MODEL}` : 'Real cases in the ministries\' queues (imported, typed in or from a connected case system)',
  };

  // The crisis banner needs serious incidents to name. A sample posture alone
  // ("critical" from the pressure model with nothing serious) raises it only
  // where samples are allowed, and then says it is the pressure model.
  let banner: ExecutivePosture['banner'] = { show: false, text: '', kind: postureKind, src: postureSrc };
  if (loaded) {
    if (crit >= 1 && (level === 'alert' || crit >= 4)) {
      banner = {
        show: true,
        text: `${crit} serious incident${crit === 1 ? '' : 's'} ${samples ? 'in the example data' : 'recorded'} · cabinet coordination advised`,
        kind: samples ? 'sample' : 'record',
        src: samples ? `Seeded ministry incidents · ${REFERENCE_MODEL}` : 'Ministry incidents recorded by officials',
      };
    } else if (samples && level === 'alert') {
      banner = { show: true, text: 'Sample pressure model reads critical · no serious incident recorded', kind: 'sample', src: postureSrc };
    }
  }

  const generated = samples
    ? { show: true, kind: 'sample' as SignalKind, src: REFERENCE_MODEL }
    : { show: false, kind: 'unavailable' as SignalKind, src: 'No source connected; generated figures are not shown on a production installation' };

  return { samples, loaded, risk, readiness, incidents: incidentsFig, queues, banner, generated };
}
