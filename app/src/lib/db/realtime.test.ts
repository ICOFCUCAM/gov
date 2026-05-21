import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();

vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
}));

import { subscribeRealtime } from './realtime';

beforeEach(() => {
  publicClientMock.mockReset();
});

describe('subscribeRealtime', () => {
  it('returns a no-op unsubscribe when the substrate is unavailable', () => {
    publicClientMock.mockReturnValue(null);
    const unsub = subscribeRealtime({ table: 'work_items' }, () => undefined);
    expect(() => unsub()).not.toThrow();
  });

  it('opens a channel named civicos:<table>', () => {
    const onSpy = vi.fn(() => ({ subscribe: vi.fn() }));
    const channelSpy = vi.fn(() => ({ on: onSpy }));
    publicClientMock.mockReturnValue({
      channel: channelSpy,
      removeChannel: vi.fn(),
    });
    subscribeRealtime({ table: 'work_items' }, () => undefined);
    expect(channelSpy).toHaveBeenCalledWith('civicos:work_items');
  });

  it('appends the channelKey suffix when supplied', () => {
    const onSpy = vi.fn(() => ({ subscribe: vi.fn() }));
    const channelSpy = vi.fn(() => ({ on: onSpy }));
    publicClientMock.mockReturnValue({ channel: channelSpy, removeChannel: vi.fn() });
    subscribeRealtime({ table: 'dispatches', channelKey: 'noc' }, () => undefined);
    expect(channelSpy).toHaveBeenCalledWith('civicos:dispatches:noc');
  });

  it('passes the schema/table to postgres_changes and defaults event to "*"', () => {
    const subscribeSpy = vi.fn();
    const onSpy = vi.fn((_evt: string, opts: Record<string, unknown>) => {
      expect(opts.schema).toBe('civicos');
      expect(opts.table).toBe('escalations');
      expect(opts.event).toBe('*');
      return { subscribe: subscribeSpy };
    });
    publicClientMock.mockReturnValue({
      channel: () => ({ on: onSpy }),
      removeChannel: vi.fn(),
    });
    subscribeRealtime({ table: 'escalations' }, () => undefined);
    expect(subscribeSpy).toHaveBeenCalled();
  });

  it('attaches a row filter when supplied', () => {
    const onSpy = vi.fn((_evt: string, opts: Record<string, unknown>) => {
      expect(opts.filter).toBe('ref=eq.WI-1');
      return { subscribe: vi.fn() };
    });
    publicClientMock.mockReturnValue({
      channel: () => ({ on: onSpy }),
      removeChannel: vi.fn(),
    });
    subscribeRealtime({ table: 'work_items', filter: 'ref=eq.WI-1' }, () => undefined);
    expect(onSpy).toHaveBeenCalled();
  });

  it('removes the channel on unsubscribe', () => {
    const removeChannel = vi.fn();
    const channelObj = { on: () => ({ subscribe: vi.fn() }) };
    publicClientMock.mockReturnValue({
      channel: () => channelObj,
      removeChannel,
    });
    const unsub = subscribeRealtime({ table: 'work_items' }, () => undefined);
    unsub();
    expect(removeChannel).toHaveBeenCalledWith(channelObj);
  });
});
