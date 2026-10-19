// AWS Signature Version 4 for S3-compatible object storage (backups,
// lib/backup/s3.ts): the nation's own MinIO, Ceph RGW, or a cloud bucket.
// Written here rather than taken from an SDK: it is a small, fully specified
// algorithm (header signing only, no presigned URLs, no chunked uploads) and
// is held to the published test vectors in sigv4.test.ts.
//
//   canonical request = method \n canonical URI \n canonical query \n
//                       canonical headers \n signed headers \n payload hash
//   string to sign    = "AWS4-HMAC-SHA256" \n amz date \n scope \n hash(canonical request)
//   signing key       = HMAC chain over "AWS4"+secret, date, region, service, "aws4_request"
//
// S3 does not normalise the path (no "." / ".." removal) and encodes each
// segment once; other services encode twice. Both are supported (`s3`).

import { createHash, createHmac } from 'node:crypto';

export interface Credentials { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
export interface SignInput {
  method: string;
  url: URL;
  /** Headers to send; `host` is added from the URL when missing. Names are matched case-insensitively. */
  headers: Record<string, string>;
  /** The payload's SHA-256 (hex), or 'UNSIGNED-PAYLOAD'. */
  payloadHash: string;
  region: string;
  service: string;
  /** The request time. */
  date: Date;
  credentials: Credentials;
  /** S3 rules: segments encoded once, path not normalised (default true for service 's3'). */
  s3?: boolean;
}

export const sha256Hex = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string): Buffer => createHmac('sha256', key).update(data, 'utf8').digest();

/** RFC 3986 encoding as SigV4 wants it: unreserved characters kept, everything else %XX (upper case). */
export function uriEncode(s: string, keepSlash = false): string {
  let out = '';
  for (const byte of Buffer.from(s, 'utf8')) {
    const c = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-._~]/.test(c) || (keepSlash && c === '/')) out += c;
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

/** `20130524T000000Z` */
export const amzDate = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function canonicalUri(url: URL, s3: boolean): string {
  // URL.pathname is already percent-encoded where needed; decode each segment and encode it the SigV4 way.
  const segments = url.pathname.split('/').map(seg => { try { return decodeURIComponent(seg); } catch { return seg; } });
  if (s3) return segments.map(seg => uriEncode(seg)).join('/') || '/';
  // Other services: normalise (drop empty and "." segments, resolve ".."), then encode twice.
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop(); else out.push(seg);
  }
  const trailing = url.pathname.length > 1 && url.pathname.endsWith('/') ? '/' : '';
  return `/${out.map(seg => uriEncode(uriEncode(seg))).join('/')}${out.length ? trailing : ''}`;
}

function canonicalQuery(url: URL): string {
  const pairs: [string, string][] = [];
  for (const [k, v] of url.searchParams) pairs.push([uriEncode(k), uriEncode(v)]);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

export interface Signed {
  /** Every header to send, with x-amz-date, x-amz-content-sha256 (S3), the token and Authorization added. */
  headers: Record<string, string>;
  canonicalRequest: string;
  stringToSign: string;
  signature: string;
}

/** Sign a request (header signing). */
export function signV4(input: SignInput): Signed {
  const s3 = input.s3 ?? input.service === 's3';
  const when = amzDate(input.date);
  const day = when.slice(0, 8);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers)) headers[k.toLowerCase()] = v;
  headers.host ??= input.url.host;
  headers['x-amz-date'] = when;
  if (s3) headers['x-amz-content-sha256'] ??= input.payloadHash;
  if (input.credentials.sessionToken) headers['x-amz-security-token'] = input.credentials.sessionToken;
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map(n => `${n}:${headers[n]!.trim().replace(/\s+/g, ' ')}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [input.method.toUpperCase(), canonicalUri(input.url, s3), canonicalQuery(input.url), canonicalHeaders, signedHeaders, input.payloadHash].join('\n');
  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', when, scope, sha256Hex(canonicalRequest)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${input.credentials.secretAccessKey}`, day), input.region), input.service), 'aws4_request');
  const signature = createHmac('sha256', key).update(stringToSign, 'utf8').digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { headers, canonicalRequest, stringToSign, signature };
}
