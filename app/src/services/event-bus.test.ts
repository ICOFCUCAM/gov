import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/repos/events', () => ({
  publishEventRow: vi.fn(async () => null),
  recentEventsRows: vi.fn(async () => []),
  substrateAvailable: () => false,
}));

import {
  publish, subscribe, subscribeBus, version,
  eventLog, eventStats, __resetBus,
} from './event-bus';

beforeEach(() => {
  __resetBus();
});

describe('publish + eventLog', () => {
  it('logs newest-first', () => {
    publish('app.registered', 'src', { a: 1 });
    publish('institution.metric', 'src', { b: 2 });
    const log = eventLog();
    expect(log[0]!.type).toBe('institution.metric');
    expect(log[1]!.type).toBe('app.registered');
  });

  it('filters by type when requested', () => {
    publish('app.registered', 'src', null);
    publish('institution.metric', 'src', null);
    publish('app.registered', 'src', null);
    expect(eventLog(100, 'app.registered')).toHaveLength(2);
  });

  it('caps the log at 500 entries', () => {
    for (let i = 0; i < 510; i++) publish('runtime.transition', 'src', { i });
    expect(eventLog(1000)).toHaveLength(500);
  });
});

describe('subscribe', () => {
  it('invokes a typed handler and a "*" handler', () => {
    const typed = vi.fn();
    const wild = vi.fn();
    const unsub1 = subscribe('app.registered', typed);
    const unsub2 = subscribe('*', wild);
    publish('app.registered', 'src', null);
    publish('institution.metric', 'src', null);
    expect(typed).toHaveBeenCalledTimes(1);
    expect(wild).toHaveBeenCalledTimes(2);
    unsub1(); unsub2();
  });

  it('stops invoking after unsubscribe', () => {
    const fn = vi.fn();
    const unsub = subscribe('app.registered', fn);
    publish('app.registered', 'src', null);
    unsub();
    publish('app.registered', 'src', null);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('version + subscribeBus', () => {
  it('increments version and notifies listeners on each publish', () => {
    const v0 = version();
    const fn = vi.fn();
    const unsub = subscribeBus(fn);
    publish('app.registered', 'src', null);
    publish('institution.metric', 'src', null);
    expect(version()).toBe(v0 + 2);
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
  });
});

describe('eventStats', () => {
  it('counts events by type', () => {
    publish('app.registered', 'src', null);
    publish('app.registered', 'src', null);
    publish('institution.metric', 'src', null);
    const stats = eventStats();
    expect(stats.total).toBe(3);
    expect(stats.byType['app.registered']).toBe(2);
    expect(stats.byType['institution.metric']).toBe(1);
  });
});
