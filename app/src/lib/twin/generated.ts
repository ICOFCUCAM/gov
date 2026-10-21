// What a console screen does with a generated figure (lib/twin/signal.ts
// `sample` and `simulated`): one rule, read by every console surface.
//
//   demo, training   shown, with its marker (Sample or Simulation) and source
//   production       not shown: "Not connected", with the reason; a panel of
//                    generated figures folds away and opens only on request,
//                    as a simulation (the agency apps' SimulatedView does the
//                    same for whole applications)
//
// A figure read from a record, an observation or an official statement is not
// generated and is never folded. The executive posture (lib/gov/executive-
// posture.ts `generated`), the panels' fold (components/ui/Generated.tsx,
// `Panel signal=`) and every KPI tile reach this module, so a production
// installation never shows a generated number as the nation's.
// Pure: no imports from the browser or the stores.

import { REFERENCE_MODEL, type SignalKind } from './signal';

export const NOT_CONNECTED = 'Not connected';

/** Why a generated figure is absent on a production installation. */
export const NOT_CONNECTED_REASON = 'No source connected; generated figures are not shown on a production installation';

export interface GeneratedPolicy {
  /** Whether the generated figure is shown (demo and training). */
  show: boolean;
  /** The marker it carries: its own kind where shown, `unavailable` where not. */
  kind: SignalKind;
  /** The source in words (shown on hover and to screen readers). */
  src: string;
}

/** Kinds that are generated rather than read: shown only where samples are allowed. */
export const isGenerated = (kind: SignalKind | undefined): kind is 'sample' | 'simulated' => kind === 'sample' || kind === 'simulated';

/**
 * The rule for one generated figure. `samples` is `samplesAllowed()` on the
 * server or `useSamplesAllowed()` in the browser (lib/ops/mode-context.tsx).
 */
export function generatedPolicy(samples: boolean, kind: 'sample' | 'simulated' = 'sample', src: string = REFERENCE_MODEL): GeneratedPolicy {
  return samples ? { show: true, kind, src } : { show: false, kind: 'unavailable', src: NOT_CONNECTED_REASON };
}

/** The value a screen prints for a generated figure under this policy. */
export const shownValue = <T,>(p: GeneratedPolicy, value: T): T | typeof NOT_CONNECTED => (p.show ? value : NOT_CONNECTED);

/** A tone for a generated figure: its own where shown, neutral where not connected. */
export const shownTone = <T extends string>(p: GeneratedPolicy, tone: T | undefined): T | undefined => (p.show ? tone : undefined);
