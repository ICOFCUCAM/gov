import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { recordSourcesFor, readOutcome, type AppIdentity } from './register-sources';
import { SimulatedView } from './RegisterRecords';

const ministry = (arch: string): AppIdentity => ({ id: `m-${arch}`, domain: arch.toLowerCase(), kind: 'ministry', archetypeOrBranch: arch, instanceId: `min-${arch}` });
const urls = (a: AppIdentity) => recordSourcesFor(a).map(s => s.url);

// The ministry apps read the real registers through the registers' own routes
// (wiring audit part 1 §7), never around their read rules.
describe('records an institution application reads', () => {
  it('health reads facility returns and the professions it keeps', () => {
    expect(urls(ministry('HEALTH'))).toEqual(expect.arrayContaining(['/api/health-regulation', '/api/professions']));
  });
  it('education reads qualifications and inspections', () => {
    expect(urls(ministry('EDUCATION'))).toContain('/api/education');
  });
  it('finance reads tax and customs only through their authorities\' routes, and bills', () => {
    expect(urls(ministry('FINANCE'))).toEqual(expect.arrayContaining(['/api/tax', '/api/customs', '/api/payments']));
  });
  it('the agencies read their own register and cases', () => {
    expect(urls({ id: 'immigration', domain: 'immigration', kind: 'agency', archetypeOrBranch: 'INTERIOR' })[0]).toBe('/api/immigration');
    expect(urls({ id: 'customs', domain: 'customs', kind: 'agency', archetypeOrBranch: 'INTERIOR' })[0]).toBe('/api/customs');
    expect(urls({ id: 'police-command', domain: 'police', kind: 'agency', archetypeOrBranch: 'INTERIOR' })[0]).toContain('procedure=police.incident');
    expect(urls({ id: 'judiciary', domain: 'judiciary', kind: 'branch', archetypeOrBranch: 'judiciary' })).toEqual(expect.arrayContaining(['/api/courts/cause-list?days=7']));
  });
  it('every ministry sees its own cases, sites and incidents', () => {
    const u = urls(ministry('TRANSPORT'));
    expect(u).toEqual(expect.arrayContaining([
      expect.stringContaining('/api/cases?owner=min-TRANSPORT'),
      '/api/facilities?ministry=min-TRANSPORT&sites=none',
      '/api/org/ministries/min-TRANSPORT/incidents',
    ]));
  });
  it('reads only the registers\' own GET routes (no exchange service or file route around their rules)', () => {
    const all = ['HEALTH', 'EDUCATION', 'FINANCE', 'INTERIOR', 'JUSTICE', 'TRADE', 'TRANSPORT'].flatMap(a => urls(ministry(a)));
    for (const u of all) expect(u).not.toMatch(/\/api\/(exchange|registers\/check|.*\/export)/);
  });
  it('turns the routes\' answers into figures', () => {
    const tax = recordSourcesFor(ministry('FINANCE')).find(s => s.key === 'tax')!;
    expect(tax.read({ counts: { taxpayers: { 'person:active': 2, 'organisation:active': 1 }, returns: { filed: 4 }, assessments: {} } }))
      .toEqual([{ label: 'Taxpayers', value: 3 }, { label: 'Returns', value: 4 }, { label: 'Assessments', value: 0 }]);
    const cases = recordSourcesFor(ministry('HEALTH')).find(s => s.key.startsWith('cases:'))!;
    expect(cases.read({ cases: [{ pending: {}, deadlines: [{ due: '2000-01-01' }] }, { deadlines: [] }] }).map(f => f.value)).toEqual([2, 1, 1]);
  });
  it('says plainly why a read was refused, and "Not connected" when it failed', () => {
    expect(readOutcome(403, 'Only the tax authority reads the tax register', { keeper: 'the tax authority' })).toEqual({ kind: 'refused', text: 'Not readable with your account: Only the tax authority reads the tax register' });
    expect(readOutcome(401, undefined, { keeper: 'x' }).kind).toBe('sign-in');
    expect(readOutcome(500, undefined, { keeper: 'x' })).toEqual({ kind: 'not-connected', text: 'Not connected.' });
  });
});

describe('the simulation screens', () => {
  const child = React.createElement('p', null, 'GENERATED');
  it('production: folded away, said to be not connected, not rendered until opened', () => {
    const html = renderToStaticMarkup(React.createElement(SimulatedView, { mode: 'production' }, child));
    expect(html).toContain('<details');
    expect(html).toContain('Not connected');
    expect(html).not.toContain('GENERATED');
  });
  it('demo and training: shown under a Sample marker', () => {
    for (const mode of ['demo', 'training'] as const) {
      const html = renderToStaticMarkup(React.createElement(SimulatedView, { mode }, child));
      expect(html).toContain('GENERATED');
      expect(html).toContain('Sample');
    }
  });
});
