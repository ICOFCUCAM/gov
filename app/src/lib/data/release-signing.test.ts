// Signed releases and verified update media (plan I9; acceptance P5-15 "A
// disconnected institution can receive a controlled software update and
// verify its authenticity"): the publisher signs every release and every
// shipment of media (DSSE over an in-toto statement, Ed25519); the nation
// trusts a publisher key only when two of its officials agree; on the
// disconnected side the signature and every file's SHA-256 computed from the
// received bytes are checked (the offline verifier needs no server), and
// media whose contents do not verify is unusable; a production installation
// never accepts a development key.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { generateKeyPairSync } from 'node:crypto';
import { resetUpdates, enrolNation, HOME_NATION } from './updates';
import { listAudit } from './store';
import { resetMirror, registerMirror, sealMedia, custodyStep, getMirror, mediaManifestFile, signedRelease, verifyRelease, recordSync } from './mirror';
import { resetReleaseTrust, proposePublisherKey, confirmPublisherKey, revokePublisherKey, publisherKeys, trustedKeysFor } from './release-trust';
import { releaseKey, signStatement, mediaStatement, sha256Hex, RELEASE_KEY_ENV, verifyEnvelope, MEDIA_PREDICATE } from '@/lib/updates/release-signing';
import { resetSigningKeys } from '@/lib/crypto/signing-key';
import { POST as mPOST, GET as mGET } from '@/app/api/releases/mirror/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const A = { by: 'Officer A', byId: 'a' }, B = { by: 'Officer B', byId: 'b' };
const SCRIPT = resolve(__dirname, '../../../scripts/verify-update-media.mjs');
const dir = join(tmpdir(), `civicos-media-${process.pid}`);

function airGapped(): string {
  const n = enrolNation({ name: 'Island registry', iso3: 'XAA', deliveryMode: 'air-gapped', installedVersion: '1.4.0', by: 'Publisher' });
  if ('error' in n) throw new Error(n.error);
  ok(registerMirror(n.id, { registryUrl: 'oci://registry.airgap.local', by: 'Air-gap officer' }));
  return n.id;
}
function trust(nation: string, pem = releaseKey().publicKeyPem) {
  return ok(confirmPublisherKey(nation, ok(proposePublisherKey(nation, { publicKeyPem: pem, checkedWith: 'Fingerprint read back on a call to the publisher' }, A)).id, B));
}
/** Media through its chain of custody up to a verified seal. */
function delivered(nation: string) {
  const s = ok(sealMedia(nation, { releaseIds: ['DR-141'], sealId: 'SEAL-4410', by: 'Release engineering' }));
  ok(custodyStep('publisher', null, s.mediaId, { step: 'handed-over', by: 'Release engineering', to: 'Air-gap officer' }));
  ok(custodyStep('nation', nation, s.mediaId, { step: 'received', by: 'Air-gap officer' }));
  ok(custodyStep('nation', nation, s.mediaId, { step: 'seal-verified', by: 'Air-gap officer', sealId: 'SEAL-4410' }));
  return s;
}
const read = (s: { contents: { filename: string; sha256: string }[] }) => s.contents.map(c => ({ filename: c.filename, sha256: c.sha256 }));

beforeEach(() => { resetUpdates(); resetMirror(); resetReleaseTrust(); resetSigningKeys(); rmSync(dir, { recursive: true, force: true }); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

describe('signed releases and verified update media (P5-15)', () => {
  it('trusts a publisher key only when two different officials agree; one revokes it at once; every step audited', () => {
    const id = airGapped();
    expect(proposePublisherKey(id, { publicKeyPem: 'not a key', checkedWith: 'a call to the publisher' }, A)).toMatchObject({ status: 422 });
    expect(proposePublisherKey(id, { publicKeyPem: releaseKey().publicKeyPem, checkedWith: 'ok' }, A)).toMatchObject({ error: expect.stringMatching(/out of band/) });
    const p = ok(proposePublisherKey(id, { publicKeyPem: releaseKey().publicKeyPem, checkedWith: 'Fingerprint read back on a call to the publisher' }, A));
    expect(trustedKeysFor(id)).toEqual([]);
    expect(confirmPublisherKey(id, p.id, A)).toMatchObject({ status: 403 });
    const t = ok(confirmPublisherKey(id, p.id, B));
    expect(t).toMatchObject({ state: 'trusted', confirmed: { by: 'Officer B' } });
    // A newer key retires the earlier one (it still verifies what it signed before); a revoked key verifies nothing.
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString();
    trust(id, other);
    expect(publisherKeys(id).map(k => k.state)).toEqual(['trusted', 'retired']);
    expect(revokePublisherKey(id, t.id, '', A)).toMatchObject({ status: 422 });
    expect(ok(revokePublisherKey(id, t.id, 'Publisher reported the key compromised', A)).state).toBe('revoked');
    expect(listAudit().filter(e => e.resource === `UpdateChamber:${id}/publisher-keys`).map(e => e.action)).toEqual(expect.arrayContaining(['update.publisher-key.propose', 'update.publisher-key.trust', 'update.publisher-key.revoke']));
  });

  it('verifies media on the disconnected side: the signature by a trusted key and every file read from it; only then are the releases mirrored', () => {
    const id = airGapped();
    const s = delivered(id);
    expect(s.signed).toMatchObject({ keyId: releaseKey().keyId, envelope: { payloadType: 'application/vnd.in-toto+json' } });
    const envelope = mediaManifestFile(id, s.mediaId)!.envelope;
    // The seal alone does not make the releases usable.
    expect(getMirror(id)!.mirrored).not.toContain('DR-141');
    // Not yet trusted: refused, and the media is unusable.
    const untrusted = ok(custodyStep('nation', id, s.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope, files: read(s) }));
    expect(untrusted).toMatchObject({ state: 'contents-rejected', chain: expect.arrayContaining([expect.objectContaining({ step: 'contents-verified', ok: false, problems: [expect.stringMatching(/No signature by a publisher key this nation trusts/)] })]) });
    expect(custodyStep('nation', id, s.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope, files: read(s) })).toMatchObject({ status: 409, error: expect.stringMatching(/must not be used/) });
    expect(listAudit().find(e => e.action === 'update.media.contents-verified')).toMatchObject({ outcome: 'denied' });

    // Trusted by two officials: a fresh shipment verifies and its releases are mirrored.
    trust(id);
    const s2 = delivered(id);
    const v = ok(custodyStep('nation', id, s2.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope: mediaManifestFile(id, s2.mediaId)!.envelope, files: read(s2) }));
    expect(v.state).toBe('contents-verified');
    expect(getMirror(id)!.mirrored).toContain('DR-141');
  });

  it('refuses a changed file, a missing or added file, a changed statement and another shipment\'s statement', () => {
    const id = airGapped();
    trust(id);
    const step = (s: ReturnType<typeof delivered>, envelope: unknown, files: { filename: string; sha256: string }[]) => ok(custodyStep('nation', id, s.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope, files }));
    const a = delivered(id);
    const changed = read(a); changed[0]!.sha256 = sha256Hex('a tampered file');
    expect(step(a, mediaManifestFile(id, a.mediaId)!.envelope, changed)).toMatchObject({ state: 'contents-rejected', chain: expect.arrayContaining([expect.objectContaining({ problems: [expect.stringMatching(/^Changed/)] })]) });
    const b = delivered(id);
    expect(step(b, mediaManifestFile(id, b.mediaId)!.envelope, [...read(b).slice(1), { filename: 'extra.tar', sha256: sha256Hex('x') }]).chain.at(-1)!.problems).toEqual([expect.stringMatching(/^Missing/), expect.stringMatching(/^Not in the signed statement/)]);
    const c = delivered(id);
    const env = mediaManifestFile(id, c.mediaId)!.envelope;
    const payload = JSON.parse(Buffer.from(env.payload, 'base64').toString()) as { subject: { digest: { sha256: string } }[] };
    payload.subject[0]!.digest.sha256 = sha256Hex('swapped');
    expect(step(c, { ...env, payload: Buffer.from(JSON.stringify(payload)).toString('base64') }, read(c)).chain.at(-1)!.problems![0]).toMatch(/does not verify/);
    const d = delivered(id);
    expect(step(d, mediaManifestFile(id, a.mediaId)!.envelope, read(d)).chain.at(-1)!.problems![0]).toMatch(/not this media/);
    expect(getMirror(id)!.mirrored).not.toContain('DR-141');
  });

  it('in production never trusts or accepts a development key; a release key from the publisher\'s key file verifies', () => {
    const id = airGapped();
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(proposePublisherKey(id, { publicKeyPem: releaseKey().publicKeyPem, checkedWith: 'Fingerprint read back on a call' }, A)).toMatchObject({ error: expect.stringMatching(/development key/) });
    // The publisher's build holds a real key file.
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    vi.stubEnv(RELEASE_KEY_ENV, privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
    resetSigningKeys();
    expect(releaseKey()).toMatchObject({ production: true });
    trust(id, publicKey.export({ type: 'spki', format: 'pem' }).toString());
    const s = delivered(id);
    expect(ok(custodyStep('nation', id, s.mediaId, { step: 'contents-verified', by: 'Air-gap officer', envelope: mediaManifestFile(id, s.mediaId)!.envelope, files: read(s) })).state).toBe('contents-verified');
    // A release is mirrored only once its signed statement and artifacts are verified.
    expect(recordSync(id, { releaseIds: ['DR-140'], by: 'Ops' })).toMatchObject({ status: 409, error: expect.stringMatching(/Verify each release/) });
    const st = signedRelease(id, 'DR-140')!;
    const files = JSON.parse(Buffer.from(st.envelope.payload, 'base64').toString()).subject.map((x: { name: string; digest: { sha256: string } }) => ({ filename: x.name, sha256: x.digest.sha256 })) as { filename: string; sha256: string }[];
    expect(verifyRelease(id, 'DR-140', { by: 'Ops', envelope: st.envelope, files: files.map((f, i) => (i === 0 ? { ...f, sha256: sha256Hex('changed') } : f)) })).toMatchObject({ verified: false, problems: [expect.stringMatching(/^Changed/)] });
    expect(verifyRelease(id, 'DR-140', { by: 'Ops', envelope: st.envelope, files })).toEqual({ verified: true, problems: [] });
    expect(ok(recordSync(id, { releaseIds: ['DR-140'], by: 'Ops' })).mirrored).toContain('DR-140');
  });

  it('the offline verifier checks the signature and the SHA-256 of the bytes read from the media, with no server', () => {
    // Real bytes on "media": two files, the publisher's signed statement of them beside them.
    mkdirSync(join(dir, 'images'), { recursive: true });
    const files = [{ filename: 'civicos-1.4.1.oci', bytes: 'image bytes' }, { filename: 'images/restore-kit.tar', bytes: 'restore kit bytes' }];
    for (const f of files) writeFileSync(join(dir, f.filename), f.bytes);
    const st = signStatement(mediaStatement({ mediaId: 'MEDIA-9', nationId: 'xaa', sealId: 'SEAL-9', releaseIds: ['DR-141'], contents: files.map(f => ({ filename: f.filename, sha256: sha256Hex(f.bytes), sizeBytes: f.bytes.length })) }, new Date().toISOString()));
    writeFileSync(join(dir, 'media-manifest.intoto.json'), JSON.stringify(st.envelope));
    writeFileSync(join(dir, '..', `pub-${process.pid}.pem`), st.publicKeyPem);
    const pub = join(dir, '..', `pub-${process.pid}.pem`);
    const run = () => { try { return { code: 0, out: JSON.parse(execFileSync(process.execPath, [SCRIPT, dir, '--key', pub, '--json'], { encoding: 'utf8' })) }; } catch (e) { const x = e as { status: number; stdout: string }; return { code: x.status, out: JSON.parse(x.stdout) }; } };
    const good = run();
    expect(good).toMatchObject({ code: 0, out: { ok: true, media: 'MEDIA-9', signedBy: st.keyId, files: files.map(f => ({ filename: f.filename, sha256: sha256Hex(f.bytes) })) } });
    // The same files verify on the server against the trusted key (the statement as read from the media).
    expect(verifyEnvelope(st.envelope, [{ keyId: st.keyId, publicKeyPem: st.publicKeyPem, trustedFrom: '2026-01-01' }], { predicateType: MEDIA_PREDICATE })).toMatchObject({ ok: true });
    // One changed byte on the media: not verified.
    writeFileSync(join(dir, 'images/restore-kit.tar'), 'restore kit bytez');
    expect(run()).toMatchObject({ code: 1, out: { ok: false, problems: [expect.stringMatching(/Changed.*restore-kit\.tar/)] } });
    rmSync(pub, { force: true });
  });

  it('is reached through the nation\'s chamber: the trust steps, the signed statements and the custody step', async () => {
    const res = await mPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ action: 'trust-key', publicKeyPem: releaseKey().publicKeyPem, checkedWith: 'Fingerprint read back on a call', by: 'Ops A' }), headers: { 'content-type': 'application/json' } }) as never);
    expect(res.status).toBe(200);
    const g = await (await mGET(new Request('http://x') as never)).json();
    expect(g.publisherKeys).toEqual([expect.objectContaining({ state: 'proposed', keyId: releaseKey().keyId })]);
    const st = await mGET(new Request('http://x?statement=DR-141') as never);
    expect(st.headers.get('content-disposition')).toMatch(/DR-141\.release\.intoto\.json/);
    expect((await st.json()).payloadType).toBe('application/vnd.in-toto+json');
    expect(HOME_NATION).toBeTruthy();
  });
});
