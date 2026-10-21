// Panels that moved from generated figures to record-computed indicators
// (plan step I3; baseline audit B, C14/C19/C24 and the /command briefing).
// Each keeps its title (no panel removed), now leads with values computed
// from the records through the indicator register, and keeps its earlier
// generated figures reachable only inside the generated rule's fold. The tile
// says "Not connected" for a value with no source, never zero; held back for
// a small cell; and carries the Sample and Draft markers.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IndicatorTile, valueText } from './IndicatorTile';
import type { IndicatorValue } from '@/lib/indicators/types';

const SRC = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');
/** The JSX of one `<Section title="…">` up to its closing tag. */
const section = (src: string, title: string) => { const i = src.indexOf(`<Section title="${title}"`); const j = src.indexOf('</Section>', i); return i < 0 ? '' : src.slice(i, j); };

const base: IndicatorValue = {
  indicatorId: 'casework.backlog', version: 1, status: 'draft', title: 'Open cases', unit: '{cases}', period: { start: '2026-09-01', end: '2026-10-01' },
  value: 3, kind: 'record', source: { registerId: 'case-work', recordType: 'case', method: 'cases.open_at_end@1' }, coverage: { expected: 1, reporting: 1, completeness: 'complete', of: 'approved procedures' },
  disclosure: { rule: 'not personal data' }, records: { count: 3, sha256: '0'.repeat(64) }, computedAt: '2026-10-21T00:00:00Z',
};

describe('record-computed panels', () => {
  it('the ministry workspace: four panels keep their titles and lead with indicators; generated figures only folded', () => {
    const src = read('components/features/MinistryWorkspace.tsx');
    for (const [title, comp] of [['Command indicators', 'InstitutionIndicatorSeries'], ['Service figures', 'InstitutionIndicatorStrip'], ['On time', 'IndicatorBreakdown'], ['Caseload concentration', 'IndicatorBreakdown']] as const) {
      const s = section(src, title);
      expect(s, title).toContain(`<${comp} institution={id}`);
      expect(s.indexOf(`<${comp}`), title).toBeLessThan(s.indexOf('<EarlierGenerated'));
      expect(s, title).not.toContain('<SampleTag');
    }
  });

  it('/control, /command and the branch screens read the indicator register', () => {
    expect(read('app/(ministry)/control/page.tsx')).toMatch(/institutionValues\(selected\.id/);
    const cmd = read('app/(command)/command/page.tsx');
    for (const id of ['casework.cases_decided', 'casework.past_deadline', 'casework.referrals_unresolved', 'casework.decisions_citing_law']) expect(cmd).toContain(`indLine('${id}'`);
    expect(read('components/features/BranchesView.tsx')).toContain("indicatorFigure('Open cases', 'oc', rec.courtsBacklog)");
    expect(read('components/features/BranchWorkspace.tsx')).toContain("indicatorFigure('Open cases', 'oc', rec.courtsBacklog)");
  });

  it('a tile: the value with its markers, Not connected without a source, held back for a small cell', () => {
    const html = (v: IndicatorValue) => renderToStaticMarkup(h(IndicatorTile, { v }));
    expect(html(base)).toContain('>3<');
    expect(html(base)).toContain('Draft');
    expect(html(base)).not.toContain('Sample');
    expect(html({ ...base, kind: 'sample', value: 5 })).toContain('Sample');
    expect(html({ ...base, status: 'approved' })).not.toContain('Draft');
    const none = html({ ...base, value: null, kind: 'unavailable', reason: 'No approved procedure' });
    expect(none).toContain('Not connected');
    expect(none).not.toContain('>0<');
    expect(valueText({ ...base, value: null, disclosure: { rule: 'small-cell rule', suppressed: 'below-threshold' } })).toBe('Small number');
    expect(valueText({ ...base, value: null, disclosure: { rule: 'small-cell rule', suppressed: 'no-threshold' } })).toBe('Held back');
    expect(valueText({ ...base, unit: '%', value: 87.5 })).toBe('87.5%');
    expect(valueText({ ...base, unit: 'd', value: 4 })).toBe('4 days');
  });
});
