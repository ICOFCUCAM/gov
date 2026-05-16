// Pure deterministic telemetry core — no React/DOM, unit-testable.
// Shared by every command surface via re-export from SituationRoom.

export function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export const toneFor = (v: number) =>
  (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');

/**
 * Temporally-coherent sovereign telemetry: a slow seeded baseline, two
 * out-of-phase oscillations and a small bounded jitter. Sampling the same
 * key at successive `t` yields a smooth trending curve.
 */
export function wave(key: string, t: number, lo = 35, hi = 90): number {
  const a = seed(key), b = seed(key + ':φ'), c = seed(key + ':ψ');
  const span = hi - lo;
  const base = lo + span * (0.35 + a * 0.4);
  const slow = Math.sin(t / (40 + a * 60) + b * 6.28) * span * 0.18;
  const fast = Math.sin(t / (9 + c * 7) + c * 6.28) * span * 0.09;
  const jitter = (seed(`${key}:${Math.floor(t)}`) - 0.5) * span * 0.06;
  return Math.max(lo, Math.min(hi, base + slow + fast + jitter));
}

export function waveSeries(key: string, t: number, n = 16, lo = 35, hi = 90): number[] {
  return Array.from({ length: n }).map((_, i) => wave(key, t - (n - 1 - i), lo, hi));
}

/**
 * Institutional behavioural fingerprint — each archetype carries a distinct
 * per-domain stress bias so risk matrices read as differentiated
 * institutions rather than uniform noise.
 */
const ARCH_BIAS: Record<string, Partial<Record<string, number>>> = {
  ENERGY:      { ops: 8, fisc: 2, infra: 20, civil: 4, sec: 6, logi: 8, env: 10, sla: 6, esc: 10, work: 4, emrg: 8 },
  TRANSPORT:   { ops: 10, fisc: -2, infra: 16, civil: 2, sec: 2, logi: 18, env: 4, sla: 10, esc: 6, work: 6, emrg: 6 },
  HEALTH:      { ops: 14, fisc: 6, infra: 4, civil: 12, sec: 2, logi: 10, env: 2, sla: 14, esc: 12, work: 12, emrg: 16 },
  FINANCE:     { ops: 2, fisc: 20, infra: -4, civil: 6, sec: 4, logi: -2, env: -4, sla: 4, esc: 4, work: 2, emrg: 2 },
  INTERIOR:    { ops: 6, fisc: 0, infra: 2, civil: 16, sec: 22, logi: 4, env: 2, sla: 6, esc: 14, work: 4, emrg: 14 },
  EDUCATION:   { ops: 4, fisc: 6, infra: 2, civil: 8, sec: -2, logi: 2, env: 0, sla: 8, esc: 2, work: 10, emrg: 2 },
  AGRICULTURE: { ops: 6, fisc: 4, infra: 6, civil: 6, sec: 0, logi: 10, env: 18, sla: 6, esc: 6, work: 8, emrg: 8 },
  ENVIRONMENT: { ops: 4, fisc: -2, infra: 8, civil: 4, sec: 2, logi: 4, env: 22, sla: 4, esc: 6, work: 4, emrg: 12 },
  TRADE:       { ops: 6, fisc: 12, infra: 2, civil: 2, sec: 4, logi: 14, env: 2, sla: 8, esc: 4, work: 4, emrg: 2 },
  GENERIC:     { ops: 4, fisc: 4, infra: 4, civil: 4, sec: 4, logi: 4, env: 4, sla: 4, esc: 4, work: 4, emrg: 4 },
};

export function domainStress(arch: string, domain: string, pressure: number, t: number, idKey: string): number {
  const row = ARCH_BIAS[arch] ?? ARCH_BIAS.GENERIC!;
  const b = row[domain] ?? 4;
  const v = pressure * 0.34 + b + (seed(`ds:${idKey}:${domain}`) - 0.5) * 20
    + Math.sin(t / 30 + seed(`dp:${idKey}:${domain}`) * 6.28) * 9;
  return Math.max(4, Math.min(99, Math.round(v)));
}
