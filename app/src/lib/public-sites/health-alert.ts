// The public health site's alert line (audit B, P3). It never announces a
// simulated emergency as real:
//   a state of emergency recorded in the nation's legal events and in force
//   (lib/transitions, kind 'emergency')     → said, with its legal basis, in every mode
//   none recorded, production               → the plain line that none is in effect
//   none recorded, demo or training         → the simulation's alert when it has one,
//                                             marked Sample (siteProps `sampleLive`)
// The wording is pure (publicHealthAlert); readPublicHealthAlert() gathers the
// inputs on the server.

import type { InstallationMode } from '@/lib/ops/mode';
import { installationMode } from '@/lib/ops/mode';
import { inForce, type TransitionTerms } from '@/lib/transitions/state';
import type { Citation } from '@/lib/law/register';
import { publicHealthSite } from '@/lib/gov/health-operations';

export interface RecordedEmergency { ref: string; terms: Pick<TransitionTerms, 'regions' | 'trigger' | 'effectiveTo'>; basis: Pick<Citation, 'instrument' | 'eId' | 'title' | 'num'>[] }

export interface PublicHealthAlert {
  text: string;
  /** From the simulation: shown only in demo and training, marked Sample. */
  sample: boolean;
  /** A recorded state of emergency in force. */
  recorded: boolean;
}

export const NO_EMERGENCY = 'No national health emergency is in effect. Follow the advisories from your regional health authority.';

const cite = (b: RecordedEmergency['basis'][number] | undefined) =>
  !b ? 'the law it cites' : b.title ? `${b.title}${b.num ? ` ${b.num}` : ''}` : `${b.instrument}${b.eId ? ` (${b.eId})` : ''}`;

function sayEmergency(e: RecordedEmergency): string {
  const where = e.terms.regions?.length ? `in ${e.terms.regions.join(', ')}` : 'across the whole territory';
  const why = e.terms.trigger ? ` (${e.terms.trigger})` : '';
  const until = e.terms.effectiveTo ? ` until ${e.terms.effectiveTo}` : '';
  return `A state of emergency is in force ${where}${why}${until}, declared under ${cite(e.basis[0])} (${e.ref}). Follow official guidance.`;
}

/** The alert line from the recorded emergencies and, outside production, the simulation's banner. Pure. */
export function publicHealthAlert(i: { mode: InstallationMode; emergencies: RecordedEmergency[]; simulated?: { active: boolean; text: string } | null }): PublicHealthAlert {
  if (i.emergencies.length) {
    const more = i.emergencies.length > 1 ? ` ${i.emergencies.length - 1} more state(s) of emergency are also in force.` : '';
    return { text: sayEmergency(i.emergencies[0]!) + more, sample: false, recorded: true };
  }
  if (i.mode !== 'production' && i.simulated?.active) return { text: i.simulated.text, sample: true, recorded: false };
  return { text: NO_EMERGENCY, sample: false, recorded: false };
}

/** Reads the emergencies in force (and, outside production, the simulation) on the server. */
export function readPublicHealthAlert(now = new Date()): PublicHealthAlert {
  const mode = installationMode();
  let emergencies: RecordedEmergency[] = [];
  try { emergencies = inForce('emergency', now).map(x => ({ ref: x.event.ref, terms: x.terms, basis: x.basis })); } catch { emergencies = []; }
  const simulated = mode === 'production' ? null : publicHealthSite(100).emergencyBanner; // deterministic, SSR-stable
  return publicHealthAlert({ mode, emergencies, simulated });
}
