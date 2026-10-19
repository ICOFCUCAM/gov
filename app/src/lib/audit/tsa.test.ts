import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, createPrivateKey, sign, X509Certificate } from 'node:crypto';
import { buildTimeStampReq, parseTimeStampResp, checkToken, parseCaBundle, OID } from './tsa';
import { read, seq, set, int, oid, nul, octets, explicit, tlv, ctx, generalizedTime, decodeUint } from '@/lib/asn1/der';
import { DIGEST_HEX, NONCE_HEX, REQUEST_B64, RESPONSE_B64, CA_PEM, TSA_CERT_PEM, TSA_KEY_PEM, OTHER_CA_PEM } from './tsa.fixture';
import { resetAuditHeads, signHead, stampHead, verifySignedHeads, tsaImprint, listSignedHeads } from './sign';
import { recordAudit, verifyAuditChain, auditHead } from '@/lib/data/store';
import { anchorPlatformHead } from './anchor';
import { resetSigningKeys } from '@/lib/crypto/signing-key';
import type { AuditEntry } from '@/lib/api/types';

const digest = Buffer.from(DIGEST_HEX, 'hex');
const nonce = BigInt(`0x${NONCE_HEX}`);
const resp = Buffer.from(RESPONSE_B64, 'base64');
const anchors = parseCaBundle(CA_PEM);

describe('RFC 3161 DER', () => {
  it('builds the same TimeStampReq as OpenSSL', () => {
    expect(buildTimeStampReq({ digest, nonce: Buffer.from(NONCE_HEX, 'hex'), certReq: true }).toString('base64')).toBe(REQUEST_B64);
  });

  it('reads the TSA\'s answer and checks the token: imprint, nonce, CMS signature, time-stamping certificate and chain', () => {
    const r = parseTimeStampResp(resp);
    expect(r.status).toBe(0);
    expect(r.statusText).toMatch(/^granted/);
    const c = checkToken(r.token!, { digest, nonce, anchors });
    expect(c).toEqual({ ok: true, tsa: 'Testland National TSA, Republic of Testland', genTime: '2026-10-19T07:45:22.000Z', serial: '2', policy: '1.2.3.4.1', trusted: true });
  });

  it('refuses a token for another message, another nonce, a changed token or an untrusted TSA', () => {
    const token = parseTimeStampResp(resp).token!;
    expect(checkToken(token, { digest: createHash('sha256').update('other').digest() }).problem).toMatch(/imprint/);
    expect(checkToken(token, { digest, nonce: nonce + 1n }).problem).toMatch(/nonce/);
    // Change one byte of the genTime inside the TSTInfo: the signed message digest no longer matches.
    const i = token.indexOf(Buffer.from('2026', 'latin1'));
    const changed = Buffer.from(token); changed[i + 3] = changed[i + 3]! ^ 1;
    expect(checkToken(changed, { digest }).ok).toBe(false);
    expect(checkToken(token, { digest, anchors: parseCaBundle(OTHER_CA_PEM) })).toMatchObject({ ok: false, trusted: false, problem: expect.stringMatching(/does not chain/) });
    // The TSA certificate itself as the only anchor (pinned) is trusted.
    expect(checkToken(token, { digest, anchors: parseCaBundle(TSA_CERT_PEM) }).trusted).toBe(true);
  });

  it('round-trips the integers and object identifiers it writes', () => {
    expect(decodeUint(read(int(0x80n)).value)).toBe(0x80n);
    expect(read(int(0x80n)).value.toString('hex')).toBe('0080');
    expect(read(oid(OID.tstInfo)).value.toString('hex')).toBe('2a864886f70d0109100104');
  });
});

// ── A test TSA (the fixture's certificate and key), built with the DER writer ──
const tsaKey = createPrivateKey(TSA_KEY_PEM);
const tsaCert = new X509Certificate(TSA_CERT_PEM);
let serial = 100;
function respond(reqDer: Buffer, at = new Date()): Buffer {
  const req = read(reqDer);
  const imprint = req.children[1]!.children[1]!.value;
  const n = req.children.find((c, i) => i > 1 && c.tag === 0x02);
  const tst = seq(int(1), oid('1.2.3.4.1'), seq(seq(oid(OID.sha256), nul()), octets(imprint)), int(serial++), generalizedTime(at), ...(n ? [n.der] : []));
  const attrs = [seq(oid(OID.contentType), set(oid(OID.tstInfo))), seq(oid(OID.messageDigest), set(octets(createHash('sha256').update(tst).digest())))];
  const sig = sign('sha256', set(...attrs), tsaKey);
  const tbs = read(Buffer.from(tsaCert.raw)).children[0]!;
  const signerInfo = seq(int(1), seq(tbs.children[3]!.der, tbs.children[1]!.der), seq(oid(OID.sha256), nul()), tlv(ctx(0), Buffer.concat(attrs.sort(Buffer.compare))), seq(oid('1.2.840.113549.1.1.1'), nul()), octets(sig));
  const sd = seq(int(3), set(seq(oid(OID.sha256), nul())), seq(oid(OID.tstInfo), explicit(0, octets(tst))), tlv(ctx(0), Buffer.from(tsaCert.raw)), set(signerInfo));
  return seq(seq(int(0)), seq(oid(OID.signedData), explicit(0, sd)));
}

let server: http.Server;
let url = '';
let calls: http.IncomingHttpHeaders[] = [];
let refuse = false;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      calls.push(req.headers);
      if (refuse) { res.writeHead(200, { 'content-type': 'application/timestamp-reply' }); res.end(seq(seq(int(2), seq(tlv(0x0c, Buffer.from('policy not allowed')))))); return; }
      res.writeHead(200, { 'content-type': 'application/timestamp-reply' });
      res.end(respond(Buffer.concat(chunks)));
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/tsa`;
});
afterAll(() => { server.close(); });

const chain = () => (globalThis as unknown as { __civicos: { audit: AuditEntry[] } }).__civicos.audit;
describe('time-stamped audit heads', () => {
  beforeEach(() => {
    chain().length = 0; resetAuditHeads(); resetSigningKeys(); calls = []; refuse = false;
    process.env.CIVICOS_TSA_URL = url;
    process.env.CIVICOS_TSA_CA = CA_PEM;
    process.env.CIVICOS_TSA_AUTH = 'Basic dGVzdDp0ZXN0';
    process.env.CIVICOS_AUDIT_SIGN_EVERY = '2';
  });
  afterEach(() => { for (const k of ['CIVICOS_TSA_URL', 'CIVICOS_TSA_CA', 'CIVICOS_TSA_AUTH', 'CIVICOS_AUDIT_SIGN_EVERY']) delete process.env[k]; });

  it('stamps each signed head with the nation\'s TSA and keeps the checked token with it', async () => {
    recordAudit('Director', 'test.step', 'T:1', 'ok');
    recordAudit('Director', 'test.step', 'T:2', 'ok');
    const h = await stampHead(listSignedHeads()[0]!);
    expect(h.timestamp).toMatchObject({ tsa: 'Testland National TSA, Republic of Testland', trusted: true, url });
    expect(calls[0]!['content-type']).toBe('application/timestamp-query');
    expect(calls[0]!.authorization).toBe('Basic dGVzdDp0ZXN0');
    const token = Buffer.from(h.timestamp!.token, 'base64');
    expect(checkToken(token, { digest: tsaImprint(h), anchors }).ok).toBe(true);
    const v = verifyAuditChain();
    expect(v.ok).toBe(true);
    expect(v.signed).toMatchObject({ timestamped: 1, head: { seq: 2, timestamp: { tsa: 'Testland National TSA, Republic of Testland', genTime: h.timestamp!.genTime } } });
  });

  it('notices a token swapped onto another head', async () => {
    const a = await stampHead(signHead({ seq: 1, hash: 'a'.repeat(64) }));
    const b = await stampHead(signHead({ seq: 2, hash: 'b'.repeat(64) }));
    b.timestamp = { ...b.timestamp!, token: a.timestamp!.token };
    const v = verifySignedHeads(seq => ({ hash: (seq === 1 ? 'a' : 'b').repeat(64) }));
    expect(v.ok).toBe(false);
    expect(v.problem).toMatch(/time-stamp of signed head 2/);
  });

  it('records why the TSA did not stamp, and the anchor job carries the stamp when it did', async () => {
    refuse = true;
    const h = await stampHead(signHead({ seq: 1, hash: 'c'.repeat(64) }));
    expect(h.timestamp).toBeUndefined();
    expect(h.timestampError).toMatch(/refused: rejection: policy not allowed/);
    refuse = false;
    recordAudit('Director', 'test.step', 'T:3', 'ok');
    const anchored = await anchorPlatformHead();
    expect(anchored.head!.seq).toBe(auditHead()!.seq);
    expect(anchored.head!.timestamp?.tsa).toMatch(/Testland/);
  });

  it('does nothing without CIVICOS_TSA_URL', async () => {
    delete process.env.CIVICOS_TSA_URL;
    const h = await stampHead(signHead({ seq: 1, hash: 'd'.repeat(64) }));
    expect(h.timestamp).toBeUndefined();
    expect(h.timestampError).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});
