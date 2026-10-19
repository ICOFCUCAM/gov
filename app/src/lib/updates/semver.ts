// Semantic versions (semver.org 2.0.0) for the Sovereign Update Center.
//
// One deliberate extension: build metadata of the form `+sov.N` marks a
// nation-specific build made on top of a global version. Semver ignores
// build metadata for precedence; distribution cannot, because a nation must
// be able to tell its own build 1.4.1+sov.2 is newer than 1.4.1+sov.1 and
// than the global 1.4.1 it was built on. So `+sov.N` orders after its base
// and before the next global version (1.4.1 < 1.4.1+sov.1 < 1.4.2).

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  pre: (string | number)[];
  /** Nation build sequence from `+sov.N`; 0 for a plain global version. */
  build: number;
  raw: string;
}

const RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseVersion(v: string): SemVer | null {
  const m = RE.exec(v.trim());
  if (!m) return null;
  const pre = m[4] ? m[4].split('.').map(p => (/^\d+$/.test(p) ? Number(p) : p)) : [];
  const sov = m[5] ? /^sov\.(\d+)$/.exec(m[5]) : null;
  return { major: +m[1]!, minor: +m[2]!, patch: +m[3]!, pre, build: sov ? +sov[1]! : 0, raw: v.trim() };
}

export function isVersion(v: unknown): v is string {
  return typeof v === 'string' && parseVersion(v) !== null;
}

function comparePre(a: (string | number)[], b: (string | number)[]): number {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;   // a release outranks its pre-releases
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** Negative when a < b, positive when a > b, 0 when equal. Invalid versions sort first. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return (x ? 1 : 0) - (y ? 1 : 0);
  return (x.major - y.major) || (x.minor - y.minor) || (x.patch - y.patch)
    || comparePre(x.pre, y.pre) || (x.build - y.build);
}

export const gt = (a: string, b: string) => compareVersions(a, b) > 0;
export const gte = (a: string, b: string) => compareVersions(a, b) >= 0;

/** The global version a nation build was made on (drops `+sov.N`). */
export function baseOf(v: string): string {
  return v.trim().replace(/\+.*$/, '');
}

/** What kind of step a version change is, for plain-language labels. */
export function bumpKind(from: string, to: string): 'major' | 'minor' | 'patch' | 'nation-build' | 'same' | 'downgrade' {
  const a = parseVersion(from), b = parseVersion(to);
  if (!a || !b) return 'same';
  const c = compareVersions(to, from);
  if (c === 0) return 'same';
  if (c < 0) return 'downgrade';
  if (b.major !== a.major) return 'major';
  if (b.minor !== a.minor) return 'minor';
  if (b.patch !== a.patch || comparePre(a.pre, b.pre) !== 0) return 'patch';
  return 'nation-build';
}
