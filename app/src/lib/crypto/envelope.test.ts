import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseKek } from './envelope';

describe('parseKek', () => {
  it('takes a base64 key that starts with "/" as the key, not as a file path', () => {
    let key = randomBytes(32);
    while (!key.toString('base64').startsWith('/')) key = randomBytes(32);
    expect(parseKek(key.toString('base64'))).toEqual(key);
    expect(parseKek(key.toString('base64url'))).toEqual(key);
  });

  it('still reads a key from a file named by its path', () => {
    const key = randomBytes(32);
    const file = join(mkdtempSync(join(tmpdir(), 'kek-')), 'data.kek');
    writeFileSync(file, key.toString('base64'));
    expect(parseKek(file)).toEqual(key);
  });

  it('accepts hex and refuses a key of the wrong length', () => {
    const key = randomBytes(32);
    expect(parseKek(key.toString('hex'))).toEqual(key);
    expect(() => parseKek(Buffer.alloc(16, 7).toString('base64'))).toThrow(/32 bytes/);
  });
});
