import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, allReleases, getChamber, nationRecord, superviseProbations, HOME_NATION } from './updates';
import { listAudit } from './store';
import { resetLifecycle, lifecycleLines, lifecycleWarning, issueDueNotices, setLifecyclePolicy, onEolNotice, lifecyclePolicy } from './lifecycle';
import { GET as lcGET } from '@/app/api/releases/lifecycle/route';
import { POST as pubPOST } from '@/app/api/releases/publisher/lifecycle/route';

const DAY = 86_400_000;
const NOW = Date.now();
const home = () => nationRecord(HOME_NATION)!;

beforeEach(() => { resetUpdates(); resetLifecycle(); });

describe('release lines', () => {
  it('each line has active, security-only and end-of-life windows from its first release', () => {
    const lines = Object.fromEntries(lifecycleLines(allReleases(), NOW).map(l => [l.line, l]));
    expect(Object.keys(lines).sort()).toEqual(['1.3', '1.4', '1.5']);
    expect(lines['1.3']!.kind).toBe('lts');
    expect(lines['1.4']!.kind).toBe('standard');
    const l = lines['1.4']!;
    const months = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (30.44 * DAY));
    expect(months(l.gaAt, l.activeUntil)).toBe(6);
    expect(months(l.gaAt, l.endOfLife)).toBe(12);
    expect(l.phase).toBe('active');
    expect(lifecycleLines(allReleases(), NOW + 200 * DAY).find(x => x.line === '1.4')!.phase).toBe('security-only');
    expect(lifecycleLines(allReleases(), NOW + 400 * DAY).find(x => x.line === '1.4')!.phase).toBe('end-of-life');
    expect(lifecycleLines(allReleases(), NOW + 400 * DAY).find(x => x.line === '1.3')!.phase).toBe('security-only'); // LTS: 12 + 24 months
  });

  it('nation builds are not lines of their own', () => {
    expect(lifecycleLines(allReleases(), NOW).every(l => !l.latestVersion.includes('+'))).toBe(true);
  });
});

describe('the chamber warns as the installed line nears end of life', () => {
  it('notice at 12 months, warning at 6, urgent at 3, then expired', () => {
    const rs = allReleases();
    expect(lifecycleWarning(home(), rs, NOW)!.level).toBe('notice'); // 1.4 ends ~325 days out
    expect(lifecycleWarning(home(), rs, NOW + 200 * DAY)!.level).toBe('warning');
    expect(lifecycleWarning(home(), rs, NOW + 260 * DAY)!.level).toBe('urgent');
    const x = lifecycleWarning(home(), rs, NOW + 340 * DAY)!;
    expect(x.level).toBe('expired');
    expect(x.moveTo).toBe('1.5'); // a newer line, never back to the older LTS
    const c = getChamber(HOME_NATION); if ('error' in c) throw new Error(c.error);
    expect(c.lifecycle).toMatchObject({ line: '1.4', level: 'notice' });
  });

  it('an LTS line far from its end shows no warning', () => {
    expect(lifecycleWarning({ installedVersion: '1.3.0' }, allReleases(), NOW)).toBeUndefined();
  });
});

describe('end-of-life notices', () => {
  it('go out once per threshold, are audited and reach alert listeners', () => {
    const heard: string[] = [];
    onEolNotice(n => heard.push(`${n.line}:${n.months}`));
    const first = issueDueNotices(allReleases(), NOW);
    expect(first).toContainEqual({ line: '1.4', months: 12 });
    expect(issueDueNotices(allReleases(), NOW)).toEqual([]);
    const later = issueDueNotices(allReleases(), NOW + 200 * DAY);
    expect(later).toContainEqual({ line: '1.4', months: 6 });
    expect(heard).toEqual(expect.arrayContaining(['1.4:12', '1.4:6']));
    expect(listAudit().filter(a => a.action === 'lifecycle.eol-notice' && a.resource === 'Lifecycle:1.4').length).toBe(2);
    const line = lifecycleLines(allReleases(), NOW + 200 * DAY).find(l => l.line === '1.4')!;
    expect(line.notices.map(n => n.months)).toEqual([12, 6]);
    expect(line.notices.every(n => n.issuedAt)).toBe(true);
  });

  it('the watchdog issues due notices', () => {
    superviseProbations(NOW);
    expect(listAudit().some(a => a.action === 'lifecycle.eol-notice')).toBe(true);
  });
});

describe('policy', () => {
  it('is set by the publisher, validated and audited', () => {
    const lines = ['1.3', '1.4', '1.5'];
    expect(setLifecyclePolicy({ standard: { activeMonths: 6, securityMonths: 6 } }, lines)).toMatchObject({ status: 422 }); // no name
    expect(setLifecyclePolicy({ by: 'Release management', ltsLines: ['9.9'] }, lines)).toMatchObject({ status: 422 });
    expect(setLifecyclePolicy({ by: 'Release management', lts: { activeMonths: 3, securityMonths: 3 }, standard: { activeMonths: 6, securityMonths: 6 } }, lines)).toMatchObject({ status: 422 });
    const p = setLifecyclePolicy({ by: 'Release management', ltsLines: ['1.3', '1.4'], noticeMonths: [3, 12, 6] }, lines);
    expect(p).toMatchObject({ ltsLines: ['1.3', '1.4'], noticeMonths: [12, 6, 3], updatedBy: 'Release management' });
    expect(listAudit()[0]).toMatchObject({ action: 'lifecycle.policy', actor: 'Release management' });
    expect(lifecycleWarning(home(), allReleases(), NOW)).toBeUndefined(); // 1.4 is now LTS
    expect(lifecyclePolicy().ltsLines).toContain('1.4');
  });

  it('routes: the nation sees its lines; the publisher route changes the policy', async () => {
    const r = await (await lcGET(new Request('http://x/api/releases/lifecycle') as never)).json();
    expect(r.installedLine).toBe('1.4');
    expect(r.warning.level).toBe('notice');
    expect(r.lines.some((l: { line: string }) => l.line === '1.5')).toBe(false); // 1.5 is pilot-only; home is not in the pilot ring
    const res = await pubPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ by: 'Release management', standard: { activeMonths: 9, securityMonths: 9 } }), headers: { 'content-type': 'application/json' } }) as never);
    expect(res.status).toBe(200);
  });
});
