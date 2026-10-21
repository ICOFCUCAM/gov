// Cron schedules, pure (no imports): read by scripts/self-host-lib.mjs (the
// self-host scheduler) and by the app (src/lib/ops/cron-jobs.ts: a run's
// scheduled slot and the next expected run). 5-field cron in UTC, as
// Kubernetes and pg_cron run them by default.

const RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

/** One cron field as the set of values it allows. Throws on what it does not understand. */
function field(text, [lo, hi]) {
  const out = new Set();
  for (const part of text.split(',')) {
    const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
    if (!m) throw new Error(`not a cron field: ${text}`);
    const step = m[4] ? Number(m[4]) : 1;
    let a = lo, b = hi;
    if (m[1] !== '*') { a = Number(m[2]); b = m[3] !== undefined ? Number(m[3]) : (m[4] ? hi : a); }
    if (a < lo || b > hi || a > b || step < 1) throw new Error(`cron field out of range: ${text}`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

/** Parse a 5-field cron expression (minute hour day-of-month month day-of-week; lists, ranges, steps). */
export function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`a cron schedule has 5 fields: ${expr}`);
  const [min, hour, dom, mon, dow] = parts.map((p, i) => field(p, RANGES[i]));
  if (dow.has(7)) dow.add(0);
  return { min, hour, dom, mon, dow, domAny: parts[2] === '*', dowAny: parts[4] === '*' };
}

/** Whether the schedule falls on this minute (UTC, as Kubernetes and pg_cron run them by default). */
export function cronMatches(expr, at) {
  const c = typeof expr === 'string' ? parseCron(expr) : expr;
  if (!c.min.has(at.getUTCMinutes()) || !c.hour.has(at.getUTCHours()) || !c.mon.has(at.getUTCMonth() + 1)) return false;
  const d = c.dom.has(at.getUTCDate()), w = c.dow.has(at.getUTCDay());
  // Standard cron: when both day fields are restricted, either may match.
  if (c.domAny && c.dowAny) return true;
  if (c.domAny) return w;
  if (c.dowAny) return d;
  return d || w;
}

const MINUTE = 60_000;
/** How far a search for the schedule's minute looks (a year and a day: every valid schedule falls within it). */
const HORIZON = 367 * 24 * 60;

/** The latest minute at or before `at` that the schedule falls on (the run's scheduled slot), or null. */
export function previousMatch(expr, at) {
  const c = typeof expr === 'string' ? parseCron(expr) : expr;
  let t = Math.floor(at.getTime() / MINUTE) * MINUTE;
  for (let i = 0; i <= HORIZON; i++, t -= MINUTE) if (cronMatches(c, new Date(t))) return new Date(t);
  return null;
}

/** The first minute after `at` that the schedule falls on, or null. */
export function nextMatch(expr, at) {
  const c = typeof expr === 'string' ? parseCron(expr) : expr;
  let t = (Math.floor(at.getTime() / MINUTE) + 1) * MINUTE;
  for (let i = 0; i <= HORIZON; i++, t += MINUTE) if (cronMatches(c, new Date(t))) return new Date(t);
  return null;
}
