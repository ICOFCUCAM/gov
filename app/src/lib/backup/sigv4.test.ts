// Signature Version 4 against the published examples: the S3 developer guide's
// header-signing examples (GET object, PUT object, GET bucket lifecycle, list
// objects) and the SigV4 test suite's get-vanilla.
import { describe, it, expect } from 'vitest';
import { signV4, sha256Hex, uriEncode, amzDate } from './sigv4';

const S3_KEYS = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' };
const EMPTY = sha256Hex('');
const when = new Date('2013-05-24T00:00:00Z');
const s3 = (method: string, href: string, headers: Record<string, string>, payloadHash = EMPTY) =>
  signV4({ method, url: new URL(href), headers, payloadHash, region: 'us-east-1', service: 's3', date: when, credentials: S3_KEYS });

describe('SigV4 (published test vectors)', () => {
  it('S3: GET object with a range', () => {
    const r = s3('GET', 'https://examplebucket.s3.amazonaws.com/test.txt', { range: 'bytes=0-9' });
    expect(r.canonicalRequest).toBe([
      'GET', '/test.txt', '',
      'host:examplebucket.s3.amazonaws.com', 'range:bytes=0-9', `x-amz-content-sha256:${EMPTY}`, 'x-amz-date:20130524T000000Z', '',
      'host;range;x-amz-content-sha256;x-amz-date', EMPTY,
    ].join('\n'));
    expect(r.signature).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
    expect(r.headers.authorization).toBe('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  });

  it('S3: PUT object (a key with $ in it)', () => {
    const body = 'Welcome to Amazon S3.';
    const r = s3('PUT', 'https://examplebucket.s3.amazonaws.com/test$file.text', { date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' }, sha256Hex(body));
    expect(r.canonicalRequest.split('\n')[1]).toBe('/test%24file.text');
    expect(r.signature).toBe('98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
  });

  it('S3: GET bucket lifecycle (a query key without a value)', () => {
    const r = s3('GET', 'https://examplebucket.s3.amazonaws.com/?lifecycle', {});
    expect(r.canonicalRequest.split('\n')[2]).toBe('lifecycle=');
    expect(r.signature).toBe('fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543');
  });

  it('S3: list objects (sorted query parameters)', () => {
    const r = s3('GET', 'https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J', {});
    expect(r.canonicalRequest.split('\n')[2]).toBe('max-keys=2&prefix=J');
    expect(r.signature).toBe('34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
  });

  it('test suite: get-vanilla', () => {
    const r = signV4({
      method: 'GET', url: new URL('https://example.amazonaws.com/'), headers: {}, payloadHash: EMPTY,
      region: 'us-east-1', service: 'service', date: new Date('2015-08-30T12:36:00Z'),
      credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' },
    });
    expect(r.stringToSign).toBe(['AWS4-HMAC-SHA256', '20150830T123600Z', '20150830/us-east-1/service/aws4_request',
      'bb579772317eb040ac9ed261061d46c1f17a8133879d6129b6e1c25292927e63'].join('\n'));
    expect(r.signature).toBe('5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31');
  });

  it('encodes the way SigV4 asks', () => {
    expect(uriEncode('a b/c~d*é')).toBe('a%20b%2Fc~d%2A%C3%A9');
    expect(uriEncode('a/b', true)).toBe('a/b');
    expect(amzDate(new Date('2026-10-19T08:09:10.123Z'))).toBe('20261019T080910Z');
  });

  it('adds the session token to what is signed', () => {
    const r = signV4({ method: 'GET', url: new URL('https://b.example/k'), headers: {}, payloadHash: EMPTY, region: 'eu-west-1', service: 's3', date: when, credentials: { ...S3_KEYS, sessionToken: 'tok' } });
    expect(r.headers['x-amz-security-token']).toBe('tok');
    expect(r.headers.authorization).toContain('x-amz-security-token');
  });
});
