// Request bodies read with a byte cap (go-live review L-4). A declared
// Content-Length over the cap is refused before anything is read; a body sent
// without one (chunked) is read as a stream and dropped the moment it passes
// the cap, so `req.json()`, `req.text()` or `req.formData()` never hold an
// unbounded body in memory. Every upload, import and machine-feed route reads
// its body through here.

import { NextResponse } from 'next/server';

/** Returned instead of the body when it is larger than the cap. */
export const TOO_LARGE: unique symbol = Symbol('body too large');
export type TooLarge = typeof TOO_LARGE;

const mb = (n: number) => (n >= 1_000_000 ? `${Math.round(n / 100_000) / 10} MB` : `${Math.round(n / 1000)} kB`);

/** The 413 answer for a body over `max` bytes. */
export const tooLargeAnswer = (max: number, what = 'The upload'): NextResponse =>
  NextResponse.json({ error: `${what} is larger than ${mb(max)}` }, { status: 413 });

/** The declared length is over the cap (refused before reading). */
export function declaresOver(req: Request, max: number): boolean {
  const n = Number(req.headers.get('content-length') ?? '');
  return Number.isFinite(n) && n > max;
}

/** The body's bytes, at most `max` of them; TOO_LARGE once it would pass that. */
export async function readBytes(req: Request, max: number): Promise<Uint8Array | TooLarge> {
  if (declaresOver(req, max)) return TOO_LARGE;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return TOO_LARGE;
    }
    chunks.push(value);
  }
  if (chunks.length === 1) return chunks[0]!;
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

/** The body as UTF-8 text, at most `max` bytes. */
export async function readText(req: Request, max: number): Promise<string | TooLarge> {
  const b = await readBytes(req, max);
  return b === TOO_LARGE ? b : new TextDecoder().decode(b);
}

/** The body parsed as JSON (undefined when it is not JSON), at most `max` bytes. */
export async function readJson(req: Request, max: number): Promise<unknown | TooLarge> {
  const t = await readText(req, max);
  if (t === TOO_LARGE) return t;
  try { return JSON.parse(t) as unknown; } catch { return undefined; }
}

/** The body as multipart or URL-encoded form data (null when it cannot be read), at most `max` bytes. */
export async function readForm(req: Request, max: number): Promise<FormData | null | TooLarge> {
  const b = await readBytes(req, max);
  if (b === TOO_LARGE) return b;
  try {
    return await new Response(b as BodyInit, { headers: { 'content-type': req.headers.get('content-type') ?? '' } }).formData();
  } catch { return null; }
}
