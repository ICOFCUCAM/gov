import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cronAuthorized, secretAuthorized, secretEquals } from './platform-auth';

const bearer = (url: string, token: string) => new Request(url, { headers: { authorization: `Bearer ${token}` } });
const ENV = ['CIVICOS_CRON_SECRET', 'CIVICOS_EXPORT_SECRET', 'CIVICOS_PUBLISHER_SECRET', 'CIVICOS_PROVISIONING_SECRET', 'CIVICOS_LEGACY_SHARED_SECRET', 'CIVICOS_LOG_LEVEL'];

describe('the cron secret', () => {
  beforeEach(() => { process.env.CIVICOS_CRON_SECRET = 'correct-horse-battery-staple'; });
  afterEach(() => { for (const k of ENV) delete process.env[k]; vi.restoreAllMocks(); });

  it('accepts the secret as a bearer header, compared in constant time', () => {
    expect(cronAuthorized(bearer('http://x/api/cron/sla', 'correct-horse-battery-staple'))).toBe(true);
    expect(cronAuthorized(bearer('http://x/api/cron/sla', 'correct-horse-battery-stapl'))).toBe(false);
    expect(cronAuthorized(new Request('http://x/api/cron/sla', { headers: { authorization: 'Bearer ' } }))).toBe(false);
    expect(secretEquals('a', 'a')).toBe(true);
    expect(secretEquals('a', 'ab')).toBe(false);
  });

  it('refuses the secret in the query string (it ends up in logs), and logs the refusal without the token (review M-7)', () => {
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env.CIVICOS_LOG_LEVEL = 'warn';
    expect(cronAuthorized(new Request('http://x/api/cron/sla?token=correct-horse-battery-staple'))).toBe(false);
    expect(err).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(err.mock.calls[0]![0]));
    expect(line).toMatchObject({ level: 'warn', event: 'auth.secret_in_query_refused', route: '/api/cron/sla' });
    expect(JSON.stringify(line)).not.toContain('correct-horse');
  });

  it('refuses everything when no secret is configured', () => {
    delete process.env.CIVICOS_CRON_SECRET;
    expect(cronAuthorized(bearer('http://x', 'anything'))).toBe(false);
  });
});

describe('one secret per purpose (review M-7)', () => {
  afterEach(() => { for (const k of ENV) delete process.env[k]; vi.restoreAllMocks(); });

  it('does not let the cron secret open the export, the publisher or officer provisioning', () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-secret';
    for (const p of ['export', 'publisher', 'provisioning'] as const) expect(secretAuthorized(bearer('http://x/api/substrate/export', 'cron-secret'), p), p).toBe(false);
    process.env.CIVICOS_EXPORT_SECRET = 'export-secret';
    process.env.CIVICOS_PUBLISHER_SECRET = 'publisher-secret';
    process.env.CIVICOS_PROVISIONING_SECRET = 'provisioning-secret';
    expect(secretAuthorized(bearer('http://x/api/substrate/export', 'cron-secret'), 'export')).toBe(false);
    expect(secretAuthorized(bearer('http://x/api/substrate/export', 'export-secret'), 'export')).toBe(true);
    expect(secretAuthorized(bearer('http://x/api/releases/publisher', 'publisher-secret'), 'publisher')).toBe(true);
    expect(secretAuthorized(bearer('http://x/api/admin/officers/bulk', 'provisioning-secret'), 'provisioning')).toBe(true);
    // and none of the others opens the scheduled jobs or another purpose
    expect(cronAuthorized(bearer('http://x/api/cron/sla', 'export-secret'))).toBe(false);
    expect(secretAuthorized(bearer('http://x', 'publisher-secret'), 'export')).toBe(false);
    expect(secretAuthorized(new Request('http://x/api/substrate/export?token=export-secret'), 'export')).toBe(false);
  });

  it('keeps the shared secret only behind the deprecation flag, only where the purpose has no secret of its own, and logs each use', () => {
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env.CIVICOS_LOG_LEVEL = 'warn';
    process.env.CIVICOS_CRON_SECRET = 'cron-secret';
    process.env.CIVICOS_LEGACY_SHARED_SECRET = '1';
    expect(secretAuthorized(bearer('http://x/api/substrate/export', 'cron-secret'), 'export')).toBe(true);
    expect(JSON.parse(String(err.mock.calls.at(-1)![0]))).toMatchObject({ event: 'auth.shared_secret_deprecated', purpose: 'export' });
    process.env.CIVICOS_EXPORT_SECRET = 'export-secret';
    expect(secretAuthorized(bearer('http://x/api/substrate/export', 'cron-secret'), 'export')).toBe(false);
  });
});
