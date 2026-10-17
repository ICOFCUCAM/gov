import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, releaseFor, HOME_NATION } from './updates';
import { listAudit } from './store';
import {
  resetSupplyChain, provenanceSummary, provenanceEnvelope, releaseProvenance, attestationFor, escrowAgreement, escrowStatus,
  recordDeposit, verifyDeposit, requestReview, advanceReview, listReviews, allDeposits,
} from './supply-chain';
import { GET as provGET } from '@/app/api/releases/[id]/provenance/route';
import { GET as attGET } from '@/app/api/releases/download/[key]/[artifact]/provenance/route';
import { GET as escrowGET, POST as escrowPOST } from '@/app/api/releases/escrow/route';
import { POST as pubEscrowPOST } from '@/app/api/releases/publisher/escrow/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const DAY = 86_400_000;
const review = { releaseId: 'DR-140', auditor: 'National CERT', auditorKind: 'national-cert', scope: 'Payments and receipts services', purpose: 'Assurance', environment: 'reading-room', ndaAccepted: true, by: 'CISO' };

beforeEach(() => { resetUpdates(); resetSupplyChain(); });

describe('SLSA provenance', () => {
  it('names builder, source commit, build time, materials and the artifact digest', () => {
    const r = releaseFor(HOME_NATION, 'DR-141')!;
    for (const a of r.artifacts) {
      const p = provenanceSummary(r, a);
      expect(p.subject.digest.sha256).toBe(a.sha256);
      expect(p.source.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(p.source.tag).toBe('v1.4.1');
      expect(Date.parse(p.startedOn)).toBeLessThan(Date.parse(p.finishedOn));
      expect(Date.parse(p.finishedOn)).toBeLessThan(Date.parse(r.releasedAt));
      expect(p.materials.every(m => Object.values(m.digest).every(d => /^[0-9a-f]{40,64}$/.test(d)))).toBe(true);
      expect(p.verify[0]).toMatch(a.ref ? /^cosign verify-attestation .*--type slsaprovenance1/ : /^cosign verify-blob-attestation/);
      if (!a.ref) expect(p.verify[1]).toMatch(/^slsa-verifier verify-artifact .*--source-tag v1\.4\.1/);
    }
  });

  it('the attestation is a DSSE envelope over an in-toto Statement with an SLSA v1 predicate', () => {
    const r = releaseFor(HOME_NATION, 'DR-141')!;
    const a = r.artifacts[0]!;
    const env = provenanceEnvelope(r, a) as { payloadType: string; payload: string; signatures: unknown[] };
    expect(env.payloadType).toBe('application/vnd.in-toto+json');
    const st = JSON.parse(Buffer.from(env.payload, 'base64').toString()) as { _type: string; predicateType: string; subject: { digest: { sha256: string } }[] };
    expect(st._type).toBe('https://in-toto.io/Statement/v1');
    expect(st.predicateType).toBe('https://slsa.dev/provenance/v1');
    expect(st.subject[0]!.digest.sha256).toBe(a.sha256);
    expect(env.signatures.length).toBe(1);
  });

  it('a nation gets provenance only for releases it can see, and downloads are audited', async () => {
    expect(releaseProvenance('sandbox', 'DR-141-H1')).toBeUndefined(); // the home nation's own build
    const homeBuild = releaseFor(HOME_NATION, 'DR-141-H1')!;
    expect(attestationFor('sandbox', homeBuild.artifacts[0]!.id)).toBeUndefined();
    expect((await attGET(new Request('http://x'), { params: { key: key('sandbox'), artifact: homeBuild.artifacts[0]!.id } })).status).toBe(404);
    const res = await attGET(new Request('http://x'), { params: { key: key(HOME_NATION), artifact: homeBuild.artifacts[0]!.id } });
    expect(res.headers.get('content-disposition')).toMatch(/\.intoto\.jsonl"$/);
    expect(listAudit()[0]).toMatchObject({ action: 'update.provenance.download' });
    const list = await (await provGET(new Request('http://x') as never, { params: { id: 'DR-141' } })).json();
    expect(list.provenance.length).toBe(releaseFor(HOME_NATION, 'DR-141')!.artifacts.length);
    expect((await provGET(new Request(`http://x?link=${key('sandbox')}`) as never, { params: { id: 'DR-141-H1' } })).status).toBe(404);
  });
});

describe('source-code escrow', () => {
  it('each nation sees its agreement and the deposit status of its own releases only', () => {
    const a = escrowAgreement(HOME_NATION)!;
    expect(a.releaseConditions.map(c => c.key)).toEqual(['insolvency', 'end-of-support', 'material-breach']);
    const home = escrowStatus(HOME_NATION);
    expect(home.some(r => r.releaseId === 'DR-141-S1')).toBe(false);
    expect(home.find(r => r.releaseId === 'DR-140')).toMatchObject({ state: 'verified', installed: true });
    expect(home.find(r => r.releaseId === 'DR-141-H1')!.state).toBe('pending');
    expect(escrowStatus('sandbox').some(r => r.releaseId === 'DR-141-H1')).toBe(false);
    // Past the deposit deadline, a missing deposit is overdue (1.5.0 is in the pilot ring).
    expect(escrowStatus('sandbox', Date.now() + 40 * DAY).find(r => r.releaseId === 'DR-150')!.state).toBe('overdue');
  });

  it('deposits carry a contents hash and are recorded and verified with a named person, audited', () => {
    const d = ok(recordDeposit('DR-150', 'Release engineering'));
    expect(d.contentsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.contents.some(c => c.includes('v1.5.0'))).toBe(true);
    expect(recordDeposit('DR-150', 'Release engineering')).toMatchObject({ status: 409 });
    expect(listAudit()[0]).toMatchObject({ action: 'escrow.deposit', actor: 'Release engineering' });
    ok(verifyDeposit('DR-150', 'Escrow agent'));
    expect(allDeposits().find(r => r.releaseId === 'DR-150')!.state).toBe('verified');
    expect(verifyDeposit('DR-150', 'Escrow agent')).toMatchObject({ status: 409 });
  });
});

describe('source-code audit requests', () => {
  it('are validated and move through the publisher’s steps, each audited', () => {
    expect(requestReview(HOME_NATION, { ...review, ndaAccepted: false })).toMatchObject({ status: 422 });
    expect(requestReview(HOME_NATION, { ...review, releaseId: 'DR-141-S1' })).toMatchObject({ status: 422 }); // not this nation's
    const r = ok(requestReview(HOME_NATION, review));
    expect(advanceReview('nation', HOME_NATION, r.id, { action: 'approve', by: 'CISO' })).toMatchObject({ status: 422 }); // publisher's step
    ok(advanceReview('publisher', null, r.id, { action: 'scope', by: 'Publisher security', note: 'Agreed' }));
    expect(advanceReview('publisher', null, r.id, { action: 'approve', by: 'Publisher security' })).toMatchObject({ status: 422 }); // needs dates
    ok(advanceReview('publisher', null, r.id, { action: 'approve', by: 'Publisher security', start: '2026-11-02T08:00:00Z', end: '2026-11-13T17:00:00Z' }));
    ok(advanceReview('publisher', null, r.id, { action: 'start', by: 'Publisher security' }));
    expect(advanceReview('publisher', null, r.id, { action: 'complete', by: 'National CERT', findings: { summary: 'ok' } })).toMatchObject({ status: 422 });
    const done = ok(advanceReview('publisher', null, r.id, { action: 'complete', by: 'National CERT', findings: { summary: 'One medium issue in receipts', critical: 0, high: 0, medium: 1, low: 2, reportRef: 'CERT-42' } }));
    expect(done.stage).toBe('completed');
    expect(done.history.map(h => h.to)).toEqual(['requested', 'scoping', 'approved', 'in-progress', 'completed']);
    const acts = listAudit().filter(a => a.resource === `SourceReview:${HOME_NATION}/${r.id}`).map(a => a.action);
    expect(acts).toEqual(expect.arrayContaining(['escrow.source-review.request', 'escrow.source-review.scope', 'escrow.source-review.approve', 'escrow.source-review.start', 'escrow.source-review.complete']));
  });

  it('a decline needs a reason; a nation can withdraw only its own request', () => {
    const r = ok(requestReview(HOME_NATION, review));
    expect(advanceReview('publisher', null, r.id, { action: 'decline', by: 'Publisher security', note: 'no' })).toMatchObject({ status: 422 });
    expect(advanceReview('nation', 'sandbox', r.id, { action: 'withdraw', by: 'Owner' })).toMatchObject({ status: 404 });
    expect(ok(advanceReview('nation', HOME_NATION, r.id, { action: 'withdraw', by: 'CISO' })).stage).toBe('withdrawn');
    expect(listReviews('sandbox').length).toBe(0);
  });

  it('routes: the nation is resolved on the server; the publisher records deposits', async () => {
    const sb = await (await escrowGET(new Request(`http://x?link=${key('sandbox')}`) as never)).json();
    expect(sb.status.some((r: { releaseId: string }) => r.releaseId === 'DR-141-H1')).toBe(false);
    expect(sb.reviews.length).toBe(0);
    const req = await escrowPOST(json('http://x', { action: 'request-review', ...review }));
    expect(req.status).toBe(201);
    const dep = await pubEscrowPOST(json('http://x', { action: 'deposit', releaseId: 'DR-141-H1', by: 'Release engineering' }));
    expect(dep.status).toBe(200);
    const home = await (await escrowGET(new Request('http://x') as never)).json();
    expect(home.status.find((r: { releaseId: string }) => r.releaseId === 'DR-141-H1').state).toBe('deposited');
  });
});
