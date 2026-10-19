import { describe, it, expect, vi, afterEach } from 'vitest';
import { log, logger, redact, recentProblems, requestIdOf } from './log';

afterEach(() => { vi.restoreAllMocks(); delete process.env.CIVICOS_LOG_LEVEL; });

describe('structured logging', () => {
  it('writes one JSON line per entry with time, level, event, service and request id', () => {
    process.env.CIVICOS_LOG_LEVEL = 'info';
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.with({ requestId: 'req-12345678', route: '/api/twin/sources' }).info('twin.run', { rows: 47 });
    const line = JSON.parse(String(out.mock.calls[0]![0]));
    expect(line).toEqual(expect.objectContaining({ level: 'info', event: 'twin.run', service: 'civicos-app', requestId: 'req-12345678', route: '/api/twin/sources', rows: 47 }));
    expect(Date.parse(line.ts)).not.toBeNaN();
  });

  it('never logs personal data or secrets', () => {
    expect(redact({ email: 'a@b.c', password: 'x', apiKey: 'k', sessionToken: 't', phone: '1', nationalId: '9', count: 3, nested: { address: 'x', ok: true } }))
      .toEqual({ email: '[redacted]', password: '[redacted]', apiKey: '[redacted]', sessionToken: '[redacted]', phone: '[redacted]', nationalId: '[redacted]', count: 3, nested: { address: '[redacted]', ok: true } });
    expect(String(redact('x'.repeat(2000))).length).toBeLessThan(510);
    expect(redact(new Error('boom'))).toEqual({ name: 'Error', message: 'boom' });
  });

  it('honours the level and keeps the latest problems for health reports', () => {
    process.env.CIVICOS_LOG_LEVEL = 'warn';
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    expect(log('info', 'quiet')).toBeNull();
    logger.error('substrate.rpc_failed', { rpc: 'append_audit', message: 'down' });
    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(1);
    expect(recentProblems(1)[0]).toEqual(expect.objectContaining({ event: 'substrate.rpc_failed', rpc: 'append_audit' }));
  });

  it('keeps a well-formed request id and makes one otherwise', () => {
    expect(requestIdOf(new Headers({ 'x-request-id': 'abc-12345678' }))).toBe('abc-12345678');
    expect(requestIdOf(new Headers({ 'x-request-id': 'bad id <script>' }))).not.toContain('<');
  });
});
