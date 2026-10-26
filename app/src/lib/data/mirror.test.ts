import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, HOME_NATION, allReleases, enrolNation } from './updates';
import { listAudit } from './store';
import { resetMirror, registerMirror, syncManifest, recordSync, sealMedia, custodyStep, getMirror, listMedia, mediaManifestFile } from './mirror';
import { resetReleaseTrust, proposePublisherKey, confirmPublisherKey } from './release-trust';
import { releaseKey } from '@/lib/updates/release-signing';
import { GET as mGET, POST as mPOST } from '@/app/api/releases/mirror/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;

beforeEach(() => { resetUpdates(); resetMirror(); resetReleaseTrust(); });

describe('local mirror', () => {
  it('is for self-hosted and air-gapped nations only, registered by a named person', () => {
    expect(registerMirror('sandbox', { registryUrl: 'https://mirror.example', by: 'Owner' })).toMatchObject({ status: 409 });
    expect(registerMirror(HOME_NATION, { registryUrl: 'not a url', by: 'Ops' })).toMatchObject({ status: 422 });
    const m = ok(registerMirror(HOME_NATION, { registryUrl: 'https://registry.gov.internal', by: 'Platform operations' }));
    expect(m.kind).toBe('connected');
    expect(listAudit()[0]).toMatchObject({ action: 'update.mirror.register', actor: 'Platform operations' });
  });

  it('the sync manifest lists what to fetch for the delivery mode, with deltas from what is already there', () => {
    ok(registerMirror(HOME_NATION, { registryUrl: 'https://registry.gov.internal', by: 'Ops' }));
    const m = ok(syncManifest(HOME_NATION));
    expect(m.items.every(i => !i.filename.includes('offline-bundle'))).toBe(true); // self-hosted: no air-gapped bundle
    expect(m.items.some(i => i.releaseId === 'DR-141-S1')).toBe(false); // another nation's build
    // 1.4.1 has deltas from 1.4.0, which the nation runs.
    const img = m.items.find(i => i.releaseId === 'DR-141' && i.filename.endsWith('.oci'))!;
    expect(img.delta).toMatchObject({ from: '1.4.0' });
    expect(img.delta!.sizeBytes).toBeLessThan(img.sizeBytes * 0.26);
    expect(m.savedBytes).toBe(m.fullBytes - m.transferBytes);
    expect(m.savedBytes).toBeGreaterThan(0);
    // After syncing 1.4.1, it drops out of the manifest.
    ok(recordSync(HOME_NATION, { releaseIds: ['DR-141'], by: 'Ops' }));
    expect(ok(syncManifest(HOME_NATION)).items.some(i => i.releaseId === 'DR-141')).toBe(false);
    expect(recordSync(HOME_NATION, { releaseIds: ['DR-141-S1'], by: 'Ops' })).toMatchObject({ status: 422 });
    expect(getMirror(HOME_NATION)!.lastSync!.by).toBe('Ops');
  });
});

describe('physical media chain of custody', () => {
  function airGapped() {
    const n = enrolNation({ name: 'Island registry', iso3: 'XAA', deliveryMode: 'air-gapped', installedVersion: '1.4.0', by: 'Publisher' });
    if ('error' in n) throw new Error(n.error);
    return n.id;
  }

  it('each step is named, in order, audited; a matching seal makes the releases mirrored', () => {
    const id = airGapped();
    ok(registerMirror(id, { registryUrl: 'oci://registry.airgap.local', by: 'Air-gap officer' }));
    expect(sealMedia(id, { releaseIds: ['DR-141'], sealId: 'x', by: 'Release engineering' })).toMatchObject({ status: 422 });
    const s = ok(sealMedia(id, { releaseIds: ['DR-141'], sealId: 'SEAL-77821', by: 'Release engineering' }));
    expect(s.contents.some(c => c.filename.includes('offline-bundle'))).toBe(true);
    expect(custodyStep('nation', id, s.mediaId, { step: 'received', by: 'Air-gap officer' })).toMatchObject({ status: 409 }); // not handed over yet
    expect(custodyStep('publisher', null, s.mediaId, { step: 'handed-over', by: 'Release engineering' })).toMatchObject({ status: 422 }); // to whom?
    ok(custodyStep('publisher', null, s.mediaId, { step: 'handed-over', by: 'Release engineering', to: 'Air-gap officer' }));
    ok(custodyStep('nation', id, s.mediaId, { step: 'received', by: 'Air-gap officer' }));
    const v = ok(custodyStep('nation', id, s.mediaId, { step: 'seal-verified', by: 'Air-gap officer', sealId: 'seal-77821' }));
    expect(v.state).toBe('seal-verified');
    expect(v.chain.map(c => c.step)).toEqual(['sealed', 'handed-over', 'received', 'seal-verified']);
    expect(v.chain.every(c => c.by && c.auditSeq)).toBe(true);
    // Plan I9 (P5-15): the seal proves custody; the releases are mirrored once the signed contents verify too.
    expect(getMirror(id)!.mirrored).not.toContain('DR-141');
    ok(confirmPublisherKey(id, ok(proposePublisherKey(id, { publicKeyPem: releaseKey().publicKeyPem, checkedWith: 'Fingerprint read back on a call to the publisher' }, { by: 'Officer A', byId: 'a' })).id, { by: 'Officer B', byId: 'b' }));
    const c = ok(custodyStep('nation', id, s.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope: mediaManifestFile(id, s.mediaId)!.envelope, files: s.contents.map(x => ({ filename: x.filename, sha256: x.sha256 })) }));
    expect(c.state).toBe('contents-verified');
    expect(getMirror(id)!.mirrored).toContain('DR-141');
    const acts = listAudit().filter(a => a.resource === `UpdateChamber:${id}/media`).map(a => a.action);
    expect(acts).toEqual(expect.arrayContaining(['update.media.sealed', 'update.media.handed-over', 'update.media.received', 'update.media.seal-verified', 'update.media.contents-verified']));
  });

  it('a seal that does not match marks the media unusable', () => {
    const id = airGapped();
    const s = ok(sealMedia(id, { releaseIds: ['DR-141'], sealId: 'SEAL-1', by: 'RE' }));
    ok(custodyStep('publisher', null, s.mediaId, { step: 'handed-over', by: 'RE', to: 'Courier A' }));
    ok(custodyStep('nation', id, s.mediaId, { step: 'received', by: 'Officer B', note: 'Received from Courier A at the gate' }));
    const v = ok(custodyStep('nation', id, s.mediaId, { step: 'seal-verified', by: 'Officer B', sealId: 'SEAL-2' }));
    expect(v.state).toBe('seal-broken');
    expect(listAudit()[0]).toMatchObject({ action: 'update.media.seal-verified', outcome: 'denied' });
    expect(custodyStep('nation', id, s.mediaId, { step: 'seal-verified', by: 'Officer B', sealId: 'SEAL-1' })).toMatchObject({ status: 409 });
  });

  it('a nation sees and acts on its own media only', async () => {
    const id = airGapped();
    const s = ok(sealMedia(id, { releaseIds: ['DR-141'], sealId: 'SEAL-9', by: 'RE' }));
    expect(listMedia(HOME_NATION).length).toBe(0);
    expect(custodyStep('nation', HOME_NATION, s.mediaId, { step: 'received', by: 'x' })).toMatchObject({ status: 404 });
    const res = await mPOST(json('http://x', { action: 'custody', mediaId: s.mediaId, step: 'received', by: 'Ops' }));
    expect(res.status).toBe(404);
    const sb = await (await mGET(new Request(`http://x?link=${key('sandbox')}`) as never)).json();
    expect(sb).toMatchObject({ deliveryMode: 'saas', mirror: null, manifest: null });
    expect(allReleases().length).toBeGreaterThan(0);
  });
});
