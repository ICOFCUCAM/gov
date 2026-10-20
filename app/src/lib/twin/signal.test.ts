import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { needsMarker, sample, SIGNAL_LABEL } from './signal';
import { nationalSnapshot, setSovereign } from '@/lib/data/store';
import { SignalTag } from '@/components/ui/SignalTag';
import { MetricStat } from '@/components/ui/Ops';

describe('figures say where they come from', () => {
  it('mark everything that is not observed or an official record', () => {
    expect(needsMarker('observed')).toBe(false);
    expect(needsMarker('reported')).toBe(false);
    expect(needsMarker('record')).toBe(false);
    for (const k of ['modelled', 'sample', 'simulated', 'unavailable'] as const) expect(needsMarker(k)).toBe(true);
    expect(SIGNAL_LABEL.simulated).toBe('Simulation');
    expect(sample(42, '%')).toMatchObject({ value: 42, unit: '%', kind: 'sample' });
    const html = renderToStaticMarkup(React.createElement(MetricStat, { label: 'Fiscal execution index', value: '97', kind: 'sample', source: 'Reference model' }));
    expect(html).toContain('Sample');
    expect(html).toContain('Reference model');
    expect(renderToStaticMarkup(React.createElement(SignalTag, { kind: 'observed' }))).toBe('');
    expect(SIGNAL_LABEL.unavailable).toBe('Not connected');
  });

  it('never present a generated population or region count as the nation\'s', () => {
    setSovereign({ stateName: 'Republic of Meridia', regions: ['North', 'South', 'East'] }, 'test');
    const ind = nationalSnapshot().indicators;
    expect(ind.every(i => i.kind)).toBe(true);
    expect(ind.find(i => i.label === 'Population')).toMatchObject({ value: '—', kind: 'unavailable' });
    expect(ind.find(i => /regions?$/i.test(i.label))).toMatchObject({ value: '3', kind: 'reported' });
    expect(ind.find(i => i.label === 'Fiscal execution index')?.kind).toBe('sample');
  });
});
