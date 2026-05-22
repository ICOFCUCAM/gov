import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/public', () => {
  it('lists the open-data endpoints with absolute urls', async () => {
    const res = await GET(new Request('https://civic.example/api/public'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_open_data_index');
    const paths = json.endpoints.map((e: { path: string }) => e.path);
    expect(paths).toContain('/api/public/accountability');
    expect(paths).toContain('/api/public/charters');
    expect(paths).toContain('/api/public/telemetry');
    expect(json.endpoints[0].url).toBe('https://civic.example/api/public/accountability');
  });

  it('is long-cached', async () => {
    const res = await GET(new Request('https://civic.example/api/public'));
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
  });
});
