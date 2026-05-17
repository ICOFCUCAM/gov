// Decision Efficacy Ledger — accountability for sovereign command.
//
// A closed intelligence → decision → execution loop is not enough: the
// state must know whether a decision actually WORKED. This pure engine
// compares the signal a decision was held accountable to (captured at the
// moment it was raised) against that signal's live value, given the
// direction that constitutes success, and renders an efficacy verdict.
// Deterministic; no React/DOM. The loop becomes a learning loop.

export type EfficacyVerdict =
  | 'unactioned'  // the directive was never executed
  | 'pending'     // executed, no material movement yet
  | 'effective'   // signal moved materially in the intended direction
  | 'ineffective';// signal regressed against the intended direction

export interface EfficacyInput {
  baseline: number;
  current: number;
  goal: 'raise' | 'lower';
  actioned: boolean;
}
export interface EfficacyResult {
  verdict: EfficacyVerdict;
  /** signed improvement: positive = moved toward the goal */
  delta: number;
  detail: string;
}

// Movement smaller than this is noise, not effect.
const MATERIAL = 3;

export function decisionEfficacy(i: EfficacyInput): EfficacyResult {
  if (!i.actioned) {
    return { verdict: 'unactioned', delta: 0, detail: 'Directive not yet executed — no accountability signal' };
  }
  const delta = Math.round((i.goal === 'raise' ? i.current - i.baseline : i.baseline - i.current) * 100) / 100;
  const verdict: EfficacyVerdict =
    delta >= MATERIAL ? 'effective' : delta <= -MATERIAL ? 'ineffective' : 'pending';
  const moved = i.goal === 'raise' ? `${i.baseline} → ${i.current}` : `${i.baseline} → ${i.current}`;
  const detail =
    verdict === 'effective' ? `Signal improved (${moved}, +${delta} toward goal)`
      : verdict === 'ineffective' ? `Signal regressed (${moved}, ${delta} against goal)`
        : `Executed — awaiting material effect (${moved})`;
  return { verdict, delta, detail };
}

export interface EfficacyRollup {
  effective: number;
  ineffective: number;
  pending: number;
  unactioned: number;
  /** share of *actioned* decisions that were effective (0-100, −1 if none) */
  hitRate: number;
}
export function efficacyRollup(rs: EfficacyResult[]): EfficacyRollup {
  const effective = rs.filter(r => r.verdict === 'effective').length;
  const ineffective = rs.filter(r => r.verdict === 'ineffective').length;
  const pending = rs.filter(r => r.verdict === 'pending').length;
  const unactioned = rs.filter(r => r.verdict === 'unactioned').length;
  const actioned = effective + ineffective + pending;
  return {
    effective, ineffective, pending, unactioned,
    hitRate: actioned ? Math.round((effective / actioned) * 100) : -1,
  };
}
