import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, publishRelease, releaseFor, allReleases, breakGlass, decide, superviseProbations, enrolNation, HOME_NATION } from './updates';
import { resetReadiness } from './readiness';
import { stagingOff, cosign } from './testkit';
import { resetSecurity } from './security-store';
import { resetSupport } from './support';
import { resetLifecycle } from './lifecycle';
import { listAudit } from './store';
import { resetComms, whatsNew, alert, outbox, saveOfficial, removeOfficial, listOfficials, addTranslation } from './comms';
import { applyNation, nationMessages } from '@/lib/nation/registry';
import { GET as wnGET } from '@/app/api/releases/[id]/whats-new/route';
import { POST as alertsPOST, GET as alertsGET } from '@/app/api/releases/alerts/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); resetSupport(); resetLifecycle(); resetComms(); applyNation({ locale: 'en' }); });

describe("what's new", () => {
  it('is in the nation’s language when translated, otherwise English marked pending', () => {
    const r = releaseFor(HOME_NATION, 'DR-141')!;
    expect(whatsNew(r, 'sw')).toMatchObject({ locale: 'sw', translated: true, pending: false });
    expect(whatsNew(r, 'sw').summary).toMatch(/Sasisho la usalama/);
    const yo = whatsNew(r, 'yo');
    expect(yo).toMatchObject({ translated: false, pending: true, summary: r.summary });
    expect(whatsNew(r, 'en')).toMatchObject({ translated: true, pending: false });
  });

  it('lists training and administrator-guide links per release', () => {
    const w = whatsNew(releaseFor(HOME_NATION, 'DR-141')!, 'en');
    expect(w.resources.map(x => x.kind)).toEqual(expect.arrayContaining(['admin-guide', 'training', 'runbook']));
  });

  it('labels come from the nation’s dictionary; the route uses the installed nation’s language', async () => {
    applyNation({ locale: 'fr' });
    expect(nationMessages().releaseNotes.translationPending).toMatch(/Traduction en attente/);
    const r = await (await wnGET(new Request('http://x') as never, { params: Promise.resolve({ id: 'DR-141' }) })).json();
    expect(r.whatsNew).toMatchObject({ locale: 'fr', translated: true });
    const r2 = await (await wnGET(new Request('http://x') as never, { params: Promise.resolve({ id: 'DR-140' }) })).json();
    expect(r2.whatsNew).toMatchObject({ locale: 'fr', pending: true });
  });

  it('publisher translations are validated and audited', () => {
    const r = releaseFor(HOME_NATION, 'DR-140')!;
    expect(addTranslation(r, { locale: 'en', summary: 'x', by: 'a' })).toMatchObject({ status: 422 });
    ok(addTranslation(r, { locale: 'yo', summary: 'Àwọn ìlọsíwájú iṣẹ́ ìyọ̀ǹda', changes: ['a'], by: 'Translator' }));
    expect(whatsNew(r, 'yo').translated).toBe(true);
    expect(listAudit()[0]).toMatchObject({ action: 'update.release.translation', actor: 'Translator' });
  });
});

describe('alerts to named officials', () => {
  it('reach only officials subscribed to the category, on their enabled channels', () => {
    const d = alert(HOME_NATION, 'incidents', 'Probation failed');
    // CIO (email) and CISO (email + SMS) subscribe to incidents; the PS does not.
    expect(d.map(x => `${x.officialId}:${x.channel}`).sort()).toEqual(['OF-1:email', 'OF-2:email', 'OF-2:sms']);
    expect(d.every(x => x.status === 'queued')).toBe(true);
    expect(alert(HOME_NATION, 'eol', 'Line 1.4').map(x => x.officialId).sort()).toEqual(['OF-1', 'OF-3']);
    expect(alert('sandbox', 'security', 'x')).toEqual([]); // no officials named there
  });

  it('subscription changes are validated and audited', () => {
    expect(saveOfficial(HOME_NATION, { name: 'Registrar', channels: { email: true, sms: false }, by: 'CIO' })).toMatchObject({ status: 422 }); // email channel without address
    const o = ok(saveOfficial(HOME_NATION, { name: 'Registrar General', role: 'Civil registry', email: 'registrar@gov.example', subscriptions: { security: false, releases: true, incidents: false, eol: false }, by: 'CIO' }));
    expect(listAudit()[0]).toMatchObject({ action: 'update.alerts.official.add', actor: 'CIO' });
    ok(saveOfficial(HOME_NATION, { id: 'OF-2', subscriptions: { security: true, releases: false, incidents: false, eol: false }, by: 'CIO' }));
    expect(alert(HOME_NATION, 'incidents', 'x').some(x => x.officialId === 'OF-2')).toBe(false);
    expect(alert(HOME_NATION, 'releases', 'x').some(x => x.officialId === o.id)).toBe(true);
    ok(removeOfficial(HOME_NATION, o.id, 'CIO'));
    expect(listOfficials(HOME_NATION).some(x => x.id === o.id)).toBe(false);
  });

  it('go out on publish, fallback incidents and end-of-life notices', () => {
    ok(publishRelease({ channel: 'global', version: '1.4.2', title: 'Security fixes for receipts', summary: 'Fixes for receipts.', severity: 'security', changes: [{ kind: 'security', text: 'Receipt fix' }], migrations: [], breakingChanges: [], upgradeNotes: 'n', rollbackNotes: 'n', minCompatibleVersion: '1.4.0', delivery: ['saas', 'self-hosted', 'air-gapped'], by: 'Release engineering' } as never));
    expect(outbox(HOME_NATION).some(a => a.category === 'security' && a.subject.includes('1.4.2'))).toBe(true);
    // Break-glass on an installed release is a fallback incident.
    cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' });
    cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    ok(breakGlass(HOME_NATION, { by: 'CIO', reason: 'Citizens cannot pay at the counters' }));
    ok(breakGlass(HOME_NATION, { by: 'CISO' }));
    expect(outbox(HOME_NATION).some(a => a.category === 'incidents' && /Break-glass/.test(a.subject))).toBe(true);
    superviseProbations();
    expect(outbox(HOME_NATION).some(a => a.category === 'eol')).toBe(true);
    expect(allReleases().length).toBeGreaterThan(0);
  });

  it('routes: a nation manages only its own officials', async () => {
    const res = await alertsPOST(json(`http://x?link=${key('sandbox')}`, { action: 'remove', id: 'OF-1', by: 'Owner' }));
    expect(res.status).toBe(404); // OF-1 belongs to the home nation
    const sb = await (await alertsGET(new Request(`http://x?link=${key('sandbox')}`) as never)).json();
    expect(sb.officials).toEqual([]);
    const n = enrolNation({ name: 'Lake republic', deliveryMode: 'saas', installedVersion: '1.4.0', language: 'sw', by: 'P' });
    expect(n).toMatchObject({ language: 'sw' });
  });
});
