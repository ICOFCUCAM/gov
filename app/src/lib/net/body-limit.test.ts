// Go-live review L-4: bodies are read with a byte cap while they stream, not
// after a Content-Length check that a chunked body skips.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { readBytes, readText, readJson, readForm, TOO_LARGE } from './body-limit';
import { POST as xliffUpload } from '@/app/api/public-sites/[id]/translations/[locale]/xliff/route';

/** A chunked body (no Content-Length) of `chunks` × `size` bytes that counts how many chunks were pulled. */
function chunked(chunks: number, size: number) {
  const seen = { pulled: 0 };
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (seen.pulled >= chunks) { c.close(); return; }
      seen.pulled++;
      c.enqueue(new Uint8Array(size).fill(0x61));
    },
  });
  return { stream, seen };
}
const post = (url: string, body: BodyInit, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method: 'POST', body, headers, duplex: 'half' } as never);

describe('readBytes', () => {
  it('stops reading a chunked body as soon as it passes the cap', async () => {
    const { stream, seen } = chunked(1000, 64 * 1024);
    expect(await readBytes(post('http://x/', stream), 256 * 1024)).toBe(TOO_LARGE);
    expect(seen.pulled).toBeLessThanOrEqual(6);
  });

  it('refuses a declared length over the cap before reading anything', async () => {
    const { stream, seen } = chunked(10, 1024);
    const req = post('http://x/', stream, { 'content-length': String(10 * 1024 * 1024) });
    expect(await readBytes(req, 1024 * 1024)).toBe(TOO_LARGE);
    expect(seen.pulled).toBeLessThanOrEqual(1);
  });

  it('returns a body within the cap whole', async () => {
    const { stream } = chunked(4, 1000);
    const b = await readBytes(post('http://x/', stream), 4000);
    expect(b).not.toBe(TOO_LARGE);
    expect((b as Uint8Array).byteLength).toBe(4000);
    expect(await readText(post('http://x/', 'héllo'), 100)).toBe('héllo');
    expect(await readText(post('http://x/', 'x'.repeat(101)), 100)).toBe(TOO_LARGE);
  });

  it('parses JSON and forms within the cap', async () => {
    expect(await readJson(post('http://x/', '{"a":1}'), 100)).toEqual({ a: 1 });
    expect(await readJson(post('http://x/', 'not json'), 100)).toBeUndefined();
    const fd = new FormData();
    fd.set('file', new Blob(['hello']), 'a.txt');
    fd.set('body', '{"level":1}');
    const multipart = new Request('http://x/', { method: 'POST', body: fd });
    const form = await readForm(new NextRequest('http://x/', { method: 'POST', body: await multipart.arrayBuffer(), headers: { 'content-type': multipart.headers.get('content-type')! } }), 10_000);
    expect(form).toBeInstanceOf(FormData);
    expect(await ((form as FormData).get('file') as File).text()).toBe('hello');
    expect((form as FormData).get('body')).toBe('{"level":1}');
    expect(await readForm(post('http://x/', 'a=1&b=2', { 'content-type': 'application/x-www-form-urlencoded' }), 10)).toBeInstanceOf(FormData);
    expect(await readForm(post('http://x/', 'a=1&b=2&c=3', { 'content-type': 'application/x-www-form-urlencoded' }), 10)).toBe(TOO_LARGE);
  });
});

describe('upload routes', () => {
  it('an XLIFF upload without a declared length is cut off at its 2 MB cap', async () => {
    const { stream, seen } = chunked(64, 256 * 1024); // 16 MB on offer
    const r = await xliffUpload(post('http://x/api/public-sites/health/translations/fr/xliff', stream, { 'content-type': 'application/xliff+xml' }),
      { params: Promise.resolve({ id: 'health', locale: 'fr' }) });
    expect(r.status).toBe(413);
    expect(seen.pulled).toBeLessThanOrEqual(10);
  });

  it('no API route reads a whole body itself: uploads, imports and feeds go through lib/net/body-limit.ts', () => {
    const root = path.join(__dirname, '..', '..', 'app');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === 'route.ts' && /\b(req|request)\.(text|formData|arrayBuffer|blob)\(\)/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(root, p));
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
