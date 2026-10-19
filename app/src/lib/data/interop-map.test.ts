import { describe, it, expect, beforeEach } from 'vitest';
import { interoperability, CENTRAL } from './interop-map';
import { resetFacilities, proposeFacility, actOnFacility, issueSiteFeed, receiveSiteFeed, proposePolicyChange, decidePolicyChange } from './facilities';
import { listMinistries, listGrants } from './store';
import { applyNation } from '@/lib/nation/registry';

describe('digital interoperability on the map (4d)', () => {
  beforeEach(() => { resetFacilities(); applyNation({ iso3: 'KEN', regions: [] }); });

  it('draws only records the platform holds, at registered seats; institutions without a seat are listed, not placed', async () => {
    const ministry = listMinistries()[0]!;
    let r = interoperability({ signedIn: true });
    expect(r.nodes.find(n => n.id === CENTRAL)?.seat).toEqual(expect.objectContaining({ capital: true, certified: false }));
    expect(r.nodes.find(n => n.id === ministry.id)?.seat).toBeUndefined();
    const agreed = listGrants().filter(g => g.status === 'approved' && listMinistries().some(m => m.id === g.toTenant));
    expect(r.links.filter(l => l.kind === 'agreed' && l.record.startsWith('Federation grant'))).toHaveLength(agreed.length);
    expect(r.links.every(l => l.kind === 'agreed' ? l.health === 'agreed' : true)).toBe(true);

    const seat = await proposeFacility(ministry.id, { name: 'Headquarters', category: 'government-office', lng: 36.8172, lat: -1.2864 }, 'A');
    if ('error' in seat) throw new Error(seat.error);
    await actOnFacility(seat.facility.id, { action: 'publish' }, 'B');
    const feed = issueSiteFeed(ministry.id, 'Facility list', 'B');
    if ('error' in feed) throw new Error(feed.error);
    r = interoperability({ signedIn: true });
    expect(r.nodes.find(n => n.id === ministry.id)?.seat).toEqual(expect.objectContaining({ siteId: seat.facility.id }));
    expect(r.links.find(l => l.record === `Facility system ${feed.feed.id}`)).toEqual(expect.objectContaining({ kind: 'live', health: 'quiet', detail: 'connected, not called yet' }));

    const body = { sites: [{ ref: 'H1', name: 'Clinic', category: 'health', lat: -1.29, lng: 36.82 }] };
    await receiveSiteFeed(feed.feed, body, JSON.stringify(body));
    const clinic = (await import('./facilities')).listFacilities({ state: 'all' }, { signedIn: true }).find(f => f.name === 'Clinic')!;
    await actOnFacility(clinic.id, { action: 'publish' }, 'B');
    r = interoperability({ signedIn: true });
    expect(r.links.find(l => l.record === `Facility system ${feed.feed.id}`)?.health).toBe('healthy');
    expect(r.regions.find(x => x.code === 'KE-30')).toEqual({ code: 'KE-30', name: expect.any(String), sites: 2, reporting: 1 });
  }, 60_000);

  it('places a restricted seat only for viewers who may see it exactly', async () => {
    const [ministry, other] = listMinistries();
    const c = proposePolicyChange({ patch: { sensitivity: { 'government-office': { level: 'restricted', authority: 'cabinet', legalBasis: 'Protective Security Order 2026' } } }, reason: 'Seats are protected' }, 'Admin 1');
    if ('error' in c) throw new Error(c.error);
    decidePolicyChange(c.id, 'confirm', 'Admin 2');
    const seat = await proposeFacility(ministry!.id, { name: 'Headquarters', category: 'government-office', lng: 36.8172, lat: -1.2864 }, 'A');
    if ('error' in seat) throw new Error(seat.error);
    await actOnFacility(seat.facility.id, { action: 'publish' }, 'B');
    expect(interoperability({ signedIn: true }).nodes.find(n => n.id === ministry!.id)?.seat).toEqual(expect.objectContaining({ lng: 36.8172, lat: -1.2864 }));
    expect(interoperability({ signedIn: true, institution: ministry!.id }).nodes.find(n => n.id === ministry!.id)?.seat?.siteId).toBe(seat.facility.id);
    expect(interoperability({ signedIn: false }).nodes.find(n => n.id === ministry!.id)?.seat).toBeUndefined();
    expect(interoperability({ signedIn: true, institution: other!.id }).nodes.find(n => n.id === ministry!.id)?.seat).toBeUndefined();
  }, 60_000);
});
