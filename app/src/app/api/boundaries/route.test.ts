import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { resetBoundaries } from '@/lib/data/boundaries';
import { applyNation } from '@/lib/nation/registry';
import { shapefileZip, WGS84_PRJ } from '@/lib/geo/boundary-fixtures';
import type { Feature } from '@/lib/geo/boundary-files';

const SOURCE = { publisher: 'Survey of Kenya', licence: 'Open Government Licence' };
const sq = (x: number, y: number, d: number) => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];
const feats: Feature[] = [{ type: 'Feature', properties: { name: 'Nairobi', code: 'KE-30' }, geometry: { type: 'Polygon', coordinates: [sq(36.7, -1.4, 0.2)] } }];

beforeEach(() => { resetBoundaries(); applyNation({ iso3: 'KEN', regions: [] }); });

describe('/api/boundaries', () => {
  it('says which formats it reads and when it simplifies', async () => {
    const j = await (await GET(new NextRequest('http://x/api/boundaries'))).json();
    expect(j.formats).toEqual(['geojson', 'topojson', 'shapefile-zip', 'geopackage']);
    expect(j.simplifyAbove).toEqual({ vertices: 200_000, bytes: 5_000_000 });
  });

  it('checks a zipped Shapefile sent as multipart/form-data', async () => {
    const form = new FormData();
    form.set('file', new File([shapefileZip(feats, ['name', 'code'], { prj: WGS84_PRJ })], 'nairobi.zip', { type: 'application/zip' }));
    form.set('body', JSON.stringify({ level: 1, by: 'Officer A', source: SOURCE, confirmFewer: true }));
    const res = await POST(new NextRequest('http://x/api/boundaries?dryRun=1', { method: 'POST', body: form }));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.check.summary).toEqual(expect.objectContaining({ units: 1, matched: 1, fields: ['name', 'code'] }));
    expect(j.check.notes[0]).toMatch(/zipped Shapefile/);
  }, 60_000);

  it('still takes GeoJSON text in JSON, and binary files as base64', async () => {
    const text = JSON.stringify({ type: 'FeatureCollection', features: feats });
    const a = await POST(new NextRequest('http://x/api/boundaries?dryRun=1', { method: 'POST', body: JSON.stringify({ level: 1, by: 'A', text, format: 'geojson', source: SOURCE }), headers: { 'content-type': 'application/json' } }));
    expect(a.status).toBe(200);
    const b64 = Buffer.from(shapefileZip(feats, ['name', 'code'], { prj: WGS84_PRJ })).toString('base64');
    const b = await POST(new NextRequest('http://x/api/boundaries?dryRun=1', { method: 'POST', body: JSON.stringify({ level: 1, by: 'A', base64: b64, source: SOURCE }), headers: { 'content-type': 'application/json' } }));
    expect((await b.json()).check.summary.units).toBe(1);
  }, 60_000);
});
