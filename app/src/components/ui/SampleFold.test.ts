// One generated panel: Sample in demo and training, folded to Not connected
// (and not rendered) in production, and production outside the mode provider.
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SampleFold, SampleTag } from './SampleFold';
import { InstallationModeProvider } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';

const FIGURE = 'Regional figure 4,812';
const fold = (mode: InstallationMode | null, marked = false) => {
  const el = React.createElement(SampleFold, { what: 'Regional status', source: 'Ministry operations model', marked }, React.createElement('span', null, FIGURE));
  return renderToStaticMarkup(mode ? React.createElement(InstallationModeProvider, { mode }, el) : el);
};

describe('SampleFold', () => {
  it('in production folds the panel under Not connected and renders none of its figures', () => {
    for (const html of [fold('production'), fold(null)]) {
      expect(html).toContain('Not connected');
      expect(html).toContain('<details');
      expect(html).not.toContain(FIGURE);
    }
  });

  it('in demo and training shows the panel with a Sample marker (or the panel\'s own, when marked)', () => {
    for (const mode of ['demo', 'training'] as const) {
      const html = fold(mode);
      expect(html).toContain(FIGURE);
      expect(html).toContain('Sample');
      expect(html).not.toContain('<details');
    }
    expect(fold('demo', true)).toBe(`<span>${FIGURE}</span>`);
  });

  it('SampleTag says Sample where samples are allowed and Not connected in production', () => {
    const tag = (mode: InstallationMode) => renderToStaticMarkup(React.createElement(InstallationModeProvider, { mode }, React.createElement(SampleTag, { source: 'x' })));
    expect(tag('demo')).toContain('Sample');
    expect(tag('production')).toContain('Not connected');
  });
});
