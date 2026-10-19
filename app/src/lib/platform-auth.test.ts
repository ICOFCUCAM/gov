import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cronAuthorized, secretEquals } from './platform-auth';

describe('the cron secret', () => {
  beforeEach(() => { process.env.CIVICOS_CRON_SECRET = 'correct-horse-battery-staple'; });
  afterEach(() => { delete process.env.CIVICOS_CRON_SECRET; vi.restoreAllMocks(); });

  it('accepts the secret as a bearer header, compared in constant time', () => {
    expect(cronAuthorized(new Request('http://x/api/cron/sla', { headers: { authorization: 'Bearer correct-horse-battery-staple' } }))).toBe(true);
    expect(cronAuthorized(new Request('http://x/api/cron/sla', { headers: { authorization: 'Bearer correct-horse-battery-stapl' } }))).toBe(false);
    expect(cronAuthorized(new Request('http://x/api/cron/sla', { headers: { authorization: 'Bearer ' } }))).toBe(false);
    expect(secretEquals('a', 'a')).toBe(true);
    expect(secretEquals('a', 'ab')).toBe(false);
  });

  it('still accepts ?token= for schedulers that cannot send headers, and logs it as discouraged without the token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(cronAuthorized(new Request('http://x/api/cron/sla?token=correct-horse-battery-staple'))).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/\/api\/cron\/sla: the cron secret came in the query string/);
    expect(String(warn.mock.calls[0]![0])).not.toContain('correct-horse');
  });

  it('refuses everything when no secret is configured', () => {
    delete process.env.CIVICOS_CRON_SECRET;
    expect(cronAuthorized(new Request('http://x', { headers: { authorization: 'Bearer anything' } }))).toBe(false);
  });
});
