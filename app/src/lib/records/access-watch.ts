// Watching the access log (directions 15.3: "monitoring for suspicious
// access patterns"). Every run of the case-deadlines job looks at the day so
// far (unusualAccess(): many different records, repeated refusals, reads
// outside working hours) and raises each new finding once per official,
// reason and day: an audit entry `access.unusual` (official, reason, count;
// never the records) that the oversight bodies read on the audit chain and
// receive as an event. A finding is a prompt to look, never a conclusion
// about the official.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { unusualAccess } from './access-log';

interface Db { raised: Record<string, string> }
const g = globalThis as unknown as { __civicosAccessWatch?: Db };
const db = (): Db => { const d = touch('__civicosAccessWatch', g.__civicosAccessWatch ??= { raised: {} }); d.raised ??= {}; return d; };
export function resetAccessWatch(): void { g.__civicosAccessWatch = undefined; }

export function watchAccess(now = new Date()): { raised: number } {
  const day = now.toISOString().slice(0, 10);
  const d = db();
  // Forget findings from earlier days (each day starts afresh).
  for (const [k, v] of Object.entries(d.raised)) if (v < day) delete d.raised[k];
  let raised = 0;
  for (const f of unusualAccess(`${day}T00:00:00.000Z`)) {
    const key = `${f.official}|${f.reason}|${day}`;
    if (d.raised[key]) continue;
    d.raised[key] = day;
    recordAudit('access watch', 'access.unusual', `Official:${f.official}`, 'ok', `${f.name}: ${f.reason} (${f.count}) on ${day}`);
    raised++;
  }
  return { raised };
}
