import { describe, it, expect } from 'vitest';
import { csvCell, buildCsv } from './csv-download';

describe('csvCell', () => {
  it('returns empty string for null and undefined', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('passes through plain strings unchanged', () => {
    expect(csvCell('hello')).toBe('hello');
  });

  it('quotes values containing commas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
  });

  it('quotes values containing newlines', () => {
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it('quotes and escapes embedded double quotes', () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('stringifies numbers and booleans', () => {
    expect(csvCell(42)).toBe('42');
    expect(csvCell(true)).toBe('true');
  });
});

describe('buildCsv', () => {
  it('produces a CSV with header and rows', () => {
    const out = buildCsv(['a', 'b'], [[1, 2], [3, 4]]);
    expect(out).toBe('a,b\n1,2\n3,4');
  });

  it('escapes cells that need quoting', () => {
    const out = buildCsv(['x', 'y'], [['a,b', 'plain']]);
    expect(out).toBe('x,y\n"a,b",plain');
  });

  it('handles empty row set', () => {
    expect(buildCsv(['a', 'b'], [])).toBe('a,b');
  });
});
