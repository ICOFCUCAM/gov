// The S3 client against a stub object store on 127.0.0.1 that checks every
// request's SigV4 signature the way S3 does (recomputed from what arrived),
// keeps objects in memory and answers ListObjectsV2 in pages.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { S3Client } from './s3';
import { s3Target } from './target';
import { signV4, sha256Hex } from './sigv4';

const KEYS = { accessKeyId: 'CIVICOSTESTKEY', secretAccessKey: 'stub/secret+key' };
const objects = new Map<string, Buffer>();
const seen: { method: string; path: string; ok: boolean }[] = [];
let server: http.Server, endpoint: URL;

function verify(req: http.IncomingMessage, body: Buffer): boolean {
  const auth = String(req.headers.authorization ?? '');
  const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);
  if (!m || m[1] !== KEYS.accessKeyId) return false;
  const payload = String(req.headers['x-amz-content-sha256'] ?? '');
  if (payload !== sha256Hex(body)) return false;
  const headers: Record<string, string> = {};
  for (const h of m[4]!.split(';')) headers[h] = String(req.headers[h] ?? '');
  const when = String(req.headers['x-amz-date']);
  const date = new Date(`${when.slice(0, 4)}-${when.slice(4, 6)}-${when.slice(6, 8)}T${when.slice(9, 11)}:${when.slice(11, 13)}:${when.slice(13, 15)}Z`);
  const again = signV4({ method: req.method!, url: new URL(req.url!, `http://${req.headers.host}`), headers, payloadHash: payload, region: m[3]!, service: 's3', date, credentials: KEYS });
  return again.signature === m[5];
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url!, 'http://x');
      const ok = verify(req, body);
      seen.push({ method: req.method!, path: url.pathname, ok });
      if (!ok) { res.writeHead(403).end('<Error><Code>SignatureDoesNotMatch</Code></Error>'); return; }
      const [, bucket, ...rest] = url.pathname.split('/');
      if (bucket !== 'civicos-dr') { res.writeHead(404).end(); return; }
      const key = rest.map(decodeURIComponent).join('/');
      if (req.method === 'PUT') { objects.set(key, body); res.writeHead(200).end(); return; }
      if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204).end(); return; }
      if (req.method === 'GET' && key) { const o = objects.get(key); if (!o) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': 'application/octet-stream' }).end(o); return; }
      // ListObjectsV2, two keys per page.
      const prefix = url.searchParams.get('prefix') ?? '';
      const all = [...objects.keys()].filter(k => k.startsWith(prefix)).sort();
      const start = Number(url.searchParams.get('continuation-token') ?? 0);
      const page = all.slice(start, start + 2);
      const more = start + 2 < all.length;
      res.writeHead(200, { 'content-type': 'application/xml' }).end(`<?xml version="1.0"?><ListBucketResult>${page.map(k => `<Contents><Key>${k.replace(/&/g, '&amp;')}</Key><Size>${objects.get(k)!.length}</Size></Contents>`).join('')}<IsTruncated>${more}</IsTruncated>${more ? `<NextContinuationToken>${start + 2}</NextContinuationToken>` : ''}</ListBucketResult>`);
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  endpoint = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});
afterAll(() => new Promise<void>(r => server.close(() => r())));

const client = (secret = KEYS.secretAccessKey) => new S3Client({ endpoint, bucket: 'civicos-dr', region: 'eu-central-1', prefix: 'nation/', credentials: { ...KEYS, secretAccessKey: secret }, pathStyle: true, allowPrivate: true });

describe('S3-compatible backup target', () => {
  it('puts, lists across pages, gets and deletes objects with signed requests', async () => {
    const t = s3Target(client());
    const bin = Buffer.from([0, 1, 2, 255, 254, 10, 13]);
    await t.put('BK-1.cvb', bin);
    await t.put('BK-1.json', Buffer.from('{"id":"BK-1"}'));
    await t.put('BK-2.json', Buffer.from('{"id":"BK-2"}'));
    expect(objects.get('nation/BK-1.cvb')).toEqual(bin);
    expect((await t.list()).sort()).toEqual(['BK-1.cvb', 'BK-1.json', 'BK-2.json']);
    expect(await t.get('BK-1.cvb')).toEqual(bin);
    expect(await t.get('BK-9.cvb')).toBeNull();
    await t.remove('BK-2.json');
    expect(await t.list()).not.toContain('BK-2.json');
    expect(seen.every(s => s.ok)).toBe(true);
  });

  it('is refused by the store with the wrong secret', async () => {
    await expect(s3Target(client('wrong')).put('BK-3.json', Buffer.from('{}'))).rejects.toThrow(/answered 403/);
  });

  it('goes only to the configured host and refuses insecure or invalid settings', () => {
    expect(() => new S3Client({ endpoint: new URL('http://objects.gov.example'), bucket: 'civicos-dr', region: 'r', prefix: '', credentials: KEYS, pathStyle: true, allowPrivate: false })).toThrow(/https/);
    expect(() => new S3Client({ endpoint: new URL('https://u:p@objects.gov.example'), bucket: 'civicos-dr', region: 'r', prefix: '', credentials: KEYS, pathStyle: true, allowPrivate: false })).toThrow(/credentials/);
    expect(() => new S3Client({ endpoint: new URL('https://objects.gov.example'), bucket: 'Bad_Bucket', region: 'r', prefix: '', credentials: KEYS, pathStyle: true, allowPrivate: false })).toThrow(/bucket/);
    const vh = new S3Client({ endpoint: new URL('https://objects.gov.example'), bucket: 'civicos-dr', region: 'r', prefix: 'p/', credentials: KEYS, pathStyle: false, allowPrivate: false });
    expect(vh.url('p/BK-1.cvb').href).toBe('https://civicos-dr.objects.gov.example/p/BK-1.cvb');
  });

  it('refuses a public endpoint that resolves to a private address', async () => {
    const c = new S3Client({ endpoint: new URL('https://objects.gov.example'), bucket: 'civicos-dr', region: 'r', prefix: '', credentials: KEYS, pathStyle: true, allowPrivate: false, resolve: async () => ['10.0.0.5'] });
    await expect(c.get('x.json')).rejects.toThrow(/private network/);
  });
});
