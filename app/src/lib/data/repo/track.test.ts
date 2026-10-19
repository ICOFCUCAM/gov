// Noting which stores were used (./track.ts): free unless the postgres backend
// listens, transparent to the stores, and the hooks a store registers run when
// another instance's change reached it.
import { describe, it, expect, afterEach } from 'vitest';
import { touch, tracked, onFollow, followed, listenForUse } from './track';

describe('store use tracking', () => {
  afterEach(() => listenForUse(undefined));

  it('passes the store through and notes it only while the backend listens', () => {
    const seen: string[] = [];
    const s = { a: 1 };
    expect(touch('__civicosT1', s)).toBe(s);
    listenForUse(k => seen.push(k));
    expect(touch('__civicosT1', s)).toBe(s);
    expect(seen).toEqual(['__civicosT1']);
  });

  it('wraps a module-level object or Map without changing how it behaves', () => {
    const seen: unknown[] = [];
    listenForUse((k, o) => seen.push([k, o]));
    const raw = { list: [1], n: 1 };
    const o = tracked('__civicosT2', raw);
    o.list.push(2); o.n++;
    expect(raw).toEqual({ list: [1, 2], n: 2 });
    expect(JSON.stringify(o)).toBe('{"list":[1,2],"n":2}');
    const rawMap = new Map<string, number>();
    const m = tracked('__civicosT3', rawMap);
    m.set('a', 1);
    expect(m.get('a')).toBe(1);
    expect(m.size).toBe(1);
    expect([...m]).toEqual([['a', 1]]);
    expect(m instanceof Map).toBe(true);
    expect(seen.some(x => (x as unknown[])[0] === '__civicosT2' && (x as unknown[])[1] === raw)).toBe(true);
    expect(seen.some(x => (x as unknown[])[0] === '__civicosT3' && (x as unknown[])[1] === rawMap)).toBe(true);
  });

  it('runs a store\'s follow hooks, and reports what they threw', () => {
    let n = 0;
    const hook = () => { n++; };
    onFollow('__civicosT4', hook);
    onFollow('__civicosT4', hook);
    onFollow('__civicosT4', () => { throw new Error('boom'); });
    const errors = followed('__civicosT4');
    expect(n).toBe(1);
    expect(errors.map(e => e.message)).toEqual(['boom']);
    expect(followed('__civicosNone')).toEqual([]);
  });
});
