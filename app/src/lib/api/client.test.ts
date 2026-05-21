import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './client';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // @ts-expect-error vitest stub
  globalThis.fetch = fetchMock;
});

function jsonResponse(body: unknown, opts: { status?: number } = {}) {
  return {
    ok: (opts.status ?? 200) < 400,
    status: opts.status ?? 200,
    json: async () => body,
  };
}

describe('api client request helper', () => {
  it('sends JSON content-type and cache:no-store by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ permits: [] }));
    await api.permits.list();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.cache).toBe('no-store');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('throws with the server-provided error message on non-2xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'forbidden' }, { status: 403 }));
    await expect(api.permits.list()).rejects.toThrow('forbidden');
  });

  it('throws with a default message when no error field is present', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));
    await expect(api.permits.list()).rejects.toThrow(/Request failed \(500\)/);
  });
});

describe('api.permits', () => {
  it('list GETs /api/permits', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ permits: [{ id: 'p-1' }] }));
    const out = await api.permits.list();
    expect(fetchMock).toHaveBeenCalledWith('/api/permits', expect.any(Object));
    expect(out.permits).toHaveLength(1);
  });

  it('get encodes the permit id in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ permit: { id: 'p-2' } }));
    await api.permits.get('p-2');
    expect(fetchMock).toHaveBeenCalledWith('/api/permits/p-2', expect.any(Object));
  });

  it('create POSTs with the JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ permit: { id: 'p-new' } }));
    await api.permits.create({
      type: 'building', title: 'House', applicantName: 'Amina', municipality: 'Capital', fields: {},
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.title).toBe('House');
  });

  it('decide POSTs to /decide with the JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ permit: { id: 'p-1' } }));
    await api.permits.decide('p-1', { decision: 'approve', officerName: 'Amina' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/permits/p-1/decide');
    expect(init.method).toBe('POST');
  });
});

describe('api.ops.incidents', () => {
  it('ack/resolve/escalate hit the corresponding endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ incident: { id: 'i-1' } }));
    await api.ops.incidents.ack('i-1', 'NOC', 'note');
    await api.ops.incidents.resolve('i-1', 'NOC');
    await api.ops.incidents.escalate('i-1', 'NOC');
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls).toEqual([
      '/api/ops/incidents/i-1/ack',
      '/api/ops/incidents/i-1/resolve',
      '/api/ops/incidents/i-1/escalate',
    ]);
  });
});
