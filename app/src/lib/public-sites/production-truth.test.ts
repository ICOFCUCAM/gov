// Public pages never show a typed-in or simulated fact as the nation's
// (audit B, P1–P3; acceptance P0-06): the government directory's posture box
// reads its sources or says "Not connected", and the health alert announces
// only a recorded state of emergency in production.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { publicGovernmentStatus, readGovernmentStatus, NOT_CONNECTED } from './government-status';
import { publicHealthAlert, readPublicHealthAlert, NO_EMERGENCY, type RecordedEmergency } from './health-alert';
import { siteProps } from '@/apps/_shared/public/site-props';
import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { applyNation } from '@/lib/nation/registry';
import GovernmentDirectoryPage from '@/app/(public)/government/page';
import HealthPage from '@/app/(public)/health/page';
import type { NationalCoordination, NationalSnapshot } from '@/lib/api/types';

const TYPED = ['STEADY', '86/100', 'separation intact', 'intact across branches', 'Wednesday', 'Every 6h', '5 languages', '0 major incidents'];
const decode = (h: string) => h.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const theme = { ink: '#0b1a2c', inkSoft: '#13294b', primary: '#1e63b8', accent: '#3a82d0', surface: '#f4f6f9', surfaceMute: '#e8eef6', line: '#dde3ec', emergencyA: '#c1252f', emergencyB: '#a01c25' };

const snapshot = (samples: boolean, sevs: string[] = []): NationalSnapshot => ({
  samples, crossMinistryIncidents: sevs.map((severity, i) => ({ ministryId: `m${i}`, ministry: 'M', archetype: 'HEALTH', label: 'x', severity, authority: 'a' })),
  totals: { queuesBreaching: 0 },
} as unknown as NationalSnapshot);
const coordination = (basis: 'sample' | 'records', label = 'STABLE'): NationalCoordination =>
  ({ posture: { level: 'ok', label, basis, source: basis === 'sample' ? 'Seeded' : 'Recorded' } } as unknown as NationalCoordination);
const emergency: RecordedEmergency = { ref: 'TR-2026-0004', terms: { regions: ['North'], trigger: 'Severe flooding', effectiveTo: '2026-11-01' }, basis: [{ instrument: '/eli/x/act/2026/9', eId: 'sec_9', title: 'Civil Protection Act', num: 's. 9' }] };

describe('public government status', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('in production says Not connected for what no record measures, never a sample, and reads the audit chain and separation checks', () => {
    const s = publicGovernmentStatus({
      mode: 'production', snapshot: snapshot(true, ['sev1']), coordination: coordination('sample', 'CRITICAL'),
      audit: { ok: true, checked: 12, total: 12 }, separation: { checks: [{ ok: true }, { ok: false }], intact: false },
    });
    // A server answering with a sample basis is still not shown as the nation's posture.
    expect(s.posture).toMatchObject({ value: NOT_CONNECTED, kind: 'unavailable' });
    expect(s.readiness).toMatchObject({ value: NOT_CONNECTED, kind: 'unavailable' });
    expect(s.majorIncidents).toMatchObject({ value: '1', kind: 'record' });
    expect(s.lines.map(l => [l.label, l.value, l.kind])).toEqual([
      ['Cabinet sitting', 'Not recorded', 'unavailable'],
      ['Public briefing', 'Not recorded', 'unavailable'],
      ['Constitutional posture', '1 of 2 separation checks hold', 'observed'],
      ['Audit chain', '✓ verified · 12 entries', 'record'],
    ]);
    expect([s.posture, s.readiness, s.majorIncidents, ...s.lines].some(l => l.kind === 'sample')).toBe(false);
  });

  it('in production with recorded data shows the recorded posture; a source that fails reads Not connected', () => {
    const s = publicGovernmentStatus({ mode: 'production', snapshot: snapshot(false), coordination: coordination('records', 'NONE RECORDED'), audit: { ok: false, checked: 3, brokenAtSeq: 3 }, separation: null });
    expect(s.posture).toMatchObject({ value: 'NONE RECORDED', kind: 'record' });
    expect(s.lines.find(l => l.label === 'Audit chain')).toMatchObject({ value: '✗ broken at entry 3', tone: 'alert' });
    expect(s.lines.find(l => l.label === 'Constitutional posture')).toMatchObject({ value: NOT_CONNECTED, kind: 'unavailable' });
    expect(publicGovernmentStatus({ mode: 'production', snapshot: null, coordination: null, audit: null, separation: null }).posture.value).toBe(NOT_CONNECTED);
  });

  it('in demo and training marks the generated posture, readiness and incidents Sample', () => {
    const s = publicGovernmentStatus({ mode: 'demo', snapshot: snapshot(true, ['sev2', 'sev3']), coordination: coordination('sample'), audit: { ok: true, checked: 1 }, separation: { checks: [{ ok: true }], intact: true } });
    expect([s.posture.kind, s.readiness.kind, s.majorIncidents.kind]).toEqual(['sample', 'sample', 'sample']);
    expect(s.majorIncidents.value).toBe('1');
  });

  it('the page in production carries none of the typed-in figures and no sample', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    applyNation({ configured: false });
    const html = decode(renderToStaticMarkup(GovernmentDirectoryPage()));
    for (const t of TYPED) expect(html, t).not.toContain(t);
    expect(html).toContain('National readiness Not connected');
    expect(html).toContain('Not recorded');
    expect(html).toMatch(/Audit chain.*(verified|broken|Not connected)/);
    expect(html).not.toMatch(/>Sample</);
    expect(readGovernmentStatus().readiness.value).toBe(NOT_CONNECTED);
  });

  it('the page in demo marks its generated lines Sample', () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    const html = decode(renderToStaticMarkup(GovernmentDirectoryPage()));
    for (const t of TYPED) expect(html, t).not.toContain(t);
    expect(html).toMatch(/>Sample</);
  });
});

describe('public health alert', () => {
  beforeEach(() => applyNation({ configured: false }));
  afterEach(() => vi.unstubAllEnvs());
  const simulated = { active: true, text: 'Public health emergency declared — North. Follow official guidance.' };

  it('never announces a simulated emergency in production', () => {
    expect(publicHealthAlert({ mode: 'production', emergencies: [], simulated })).toEqual({ text: NO_EMERGENCY, sample: false, recorded: false });
  });

  it('marks the simulation\'s alert Sample in demo and training', () => {
    for (const mode of ['demo', 'training'] as const) expect(publicHealthAlert({ mode, emergencies: [], simulated })).toEqual({ text: simulated.text, sample: true, recorded: false });
    expect(publicHealthAlert({ mode: 'demo', emergencies: [], simulated: { active: false, text: 'x' } }).text).toBe(NO_EMERGENCY);
  });

  it('says a recorded state of emergency in force, with its legal basis, in every mode', () => {
    for (const mode of ['production', 'demo'] as const) {
      const a = publicHealthAlert({ mode, emergencies: [emergency, emergency], simulated });
      expect(a).toMatchObject({ sample: false, recorded: true });
      expect(a.text).toContain('in North (Severe flooding) until 2026-11-01, declared under Civil Protection Act s. 9 (TR-2026-0004)');
      expect(a.text).toContain('1 more');
    }
  });

  it('production reads no emergency from the simulation; the page shows no Sample alert', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(readPublicHealthAlert()).toEqual({ text: NO_EMERGENCY, sample: false, recorded: false });
    const html = decode(renderToStaticMarkup(await HealthPage({})));
    expect(html).toContain(NO_EMERGENCY);
    expect(html).not.toContain('declared —');
    expect(html).not.toContain('not a real alert');
  });

  it('a sample alert carries its marker in every design', () => {
    const live = { healthAlert: simulated.text };
    expect(siteProps('health', { theme, illustration: null, live, sampleLive: ['healthAlert'] }).alert).toMatchObject({ text: simulated.text, sample: true });
    expect(siteProps('health', { theme, illustration: null, live }).alert?.sample).toBeUndefined();
    for (const preset of [undefined, 'civic-standard']) {
      const html = decode(renderToStaticMarkup(React.createElement(PublicSite, { id: 'health', theme, illustration: null, live, sampleLive: ['healthAlert'], preset })));
      expect(html, preset).toContain('Sample · not a real alert');
    }
  });
});
