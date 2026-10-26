import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LIGHT, SOV, CONSOLE, WORKSPACE, STATUS, INFO, INSTITUTIONAL, NIGHT, DECISION_CLASS, TYPE_SCALE, TYPE_ROLES, SPACE_BASE, SPACE_SCALE, CONTROL, FOCUS, hexOf, remOf, type Ground } from './tokens';
import { sealTile, accentText, GRAPHIC } from './nation';
import { contrast, AA } from '@/apps/_shared/public/design/contrast';
import { TONE, TONE_SHAPE, TONE_WORD } from '@/lib/tone-palette';
import { PALETTE } from '@/components/features/SituationRoom';

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');
const block = (selector: string) => {
  const i = css.indexOf(`${selector} {`);
  const body = css.slice(i, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/(--c-[a-z0-9-]+):\s*([0-9]+ [0-9]+ [0-9]+)/g)].map(m => [m[1], m[2]]));
};
const hx = (g: Ground, k: string) => hexOf(g[k as keyof Ground]!);

describe('design tokens', () => {
  it('are the values the stylesheet and the console use', () => {
    expect(block(':root')).toEqual(LIGHT);
    expect(block('.sov')).toEqual(SOV);
    expect(block('.ws')).toEqual(WORKSPACE);
    expect(TONE).toEqual(STATUS);
    for (const [k, v] of Object.entries(CONSOLE)) expect((PALETTE as Record<string, string>)[k]).toBe(v);
  });

  it('give every text colour 4.5:1 on every ground it is drawn on', () => {
    for (const [name, g] of [['light', LIGHT], ['sov', SOV], ['console', CONSOLE], ['workspace', WORKSPACE]] as const) {
      for (const ground of ['--c-bg', '--c-surface', '--c-surface-2']) {
        for (const ink of ['--c-ink', '--c-ink-soft', '--c-ink-muted', '--c-link']) {
          expect(contrast(hx(g, ink), hx(g, ground)), `${name} ${ink} on ${ground}`).toBeGreaterThanOrEqual(AA);
        }
      }
    }
    for (const ground of ['--c-surface', '--c-surface-2']) {
      for (const [k, v] of Object.entries(STATUS)) expect(contrast(v, hx(CONSOLE, ground)), `status ${k} on console ${ground}`).toBeGreaterThanOrEqual(AA);
      expect(contrast(INFO, hx(CONSOLE, ground))).toBeGreaterThanOrEqual(AA);
    }
    for (const k of ['--c-ok', '--c-warn', '--c-alert']) expect(contrast(hx(LIGHT, k), '#ffffff'), `light ${k}`).toBeGreaterThanOrEqual(AA);
    for (const [k, v] of Object.entries(DECISION_CLASS)) expect(contrast(v, '#ffffff'), `class ${k}`).toBeGreaterThanOrEqual(AA);
    expect(contrast(INSTITUTIONAL.champagne, INSTITUTIONAL.ground)).toBeGreaterThanOrEqual(AA);
    // The night chrome (welcome, setup, Update Center, publisher, site editor).
    for (const ground of [NIGHT.ground, NIGHT.panel]) {
      for (const ink of ['ink', 'soft', 'muted', 'faint', 'champagneMuted'] as const) {
        expect(contrast(NIGHT[ink], ground), `night ${ink} on ${ground}`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it('keep the night text levels in order (ink > soft > muted > faint)', () => {
    const lum = (h: string) => contrast(h, '#000000');
    expect(lum(NIGHT.ink)).toBeGreaterThan(lum(NIGHT.soft));
    expect(lum(NIGHT.soft)).toBeGreaterThan(lum(NIGHT.muted));
    expect(lum(NIGHT.muted)).toBeGreaterThan(lum(NIGHT.faint));
  });

  it('are the night colours the Tailwind theme uses', async () => {
    const tw = (await import('../../../tailwind.config')).default as { theme: { extend: { colors: Record<string, string> } } };
    const c = tw.theme.extend.colors;
    expect([c['night-ink'], c['night-soft'], c['night-muted'], c['night-faint'], c['night-champagne']]).toEqual([NIGHT.ink, NIGHT.soft, NIGHT.muted, NIGHT.faint, NIGHT.champagneMuted]);
  });

  it('give every status a shape and a word, never colour alone', () => {
    for (const k of Object.keys(TONE)) { expect(TONE_SHAPE[k], k).toBeTruthy(); expect(TONE_WORD[k], k).toBeTruthy(); }
    expect(new Set(Object.values(TONE_SHAPE)).size).toBe(Object.keys(TONE).length);
  });

  it('keep any nation colour visible on the console, with a readable monogram', () => {
    const surface = hx(CONSOLE, '--c-surface');
    for (const accent of ['#1f2630', '#000000', '#7a0019', '#006b3f', '#ffd400', '#ffffff', undefined]) {
      const t = sealTile(accent, surface);
      expect(contrast(t.fill, surface), `tile ${accent}`).toBeGreaterThanOrEqual(GRAPHIC);
      expect(contrast(t.ink, t.fill), `monogram on ${accent}`).toBeGreaterThanOrEqual(AA);
      expect(contrast(accentText(accent, surface, true), surface)).toBeGreaterThanOrEqual(AA);
      expect(contrast(accentText(accent, '#ffffff', false), '#ffffff')).toBeGreaterThanOrEqual(AA);
    }
    // A colour that already stands out is kept as chosen.
    expect(sealTile('#ffd400', surface).fill).toBe('#ffd400');
  });
});

// Plan step I10: the workspace ground, the type and spacing scales, controls and focus.
const rootVar = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {'))))?.[1]?.trim();

describe('workspace ground, type, spacing and focus tokens (plan I10)', () => {
  it('keep the specification\'s workspace palette, with the secondary text darkened to 4.5:1', () => {
    expect([hx(WORKSPACE, '--c-bg'), hx(WORKSPACE, '--c-surface'), hx(WORKSPACE, '--c-ink'), hx(WORKSPACE, '--c-accent'), hx(WORKSPACE, '--c-emphasis')])
      .toEqual(['#f7f7f2', '#ffffff', '#252b29', '#193b35', '#a85d42']);
    // The specification's #6B7470 falls short on the canvas; the token is darker and passes everywhere.
    expect(contrast('#6b7470', '#f7f7f2')).toBeLessThan(AA);
    for (const ground of ['--c-bg', '--c-surface', '--c-surface-2']) {
      for (const k of ['--c-ok', '--c-warn', '--c-alert', '--c-accent']) expect(contrast(hx(WORKSPACE, k), hx(WORKSPACE, ground)), `workspace ${k} on ${ground}`).toBeGreaterThanOrEqual(AA);
    }
    // Copper: emphasis on the canvas and white surfaces only.
    for (const ground of ['--c-bg', '--c-surface']) expect(contrast(hx(WORKSPACE, '--c-emphasis'), hx(WORKSPACE, ground))).toBeGreaterThanOrEqual(AA);
    // Status colours never take the green or the copper.
    for (const k of ['--c-ok', '--c-warn', '--c-alert']) expect([WORKSPACE['--c-accent'], WORKSPACE['--c-emphasis']]).not.toContain(WORKSPACE[k as keyof Ground]);
  });

  it('have one type scale, in rem, that fills the specification\'s roles', () => {
    const px = Object.values(TYPE_SCALE);
    expect([...px].sort((a, b) => a - b)).toEqual(px);
    expect(Math.min(...px)).toBeGreaterThanOrEqual(11);
    for (const [step, v] of Object.entries(TYPE_SCALE)) expect(rootVar(`--t-${step}`), step).toBe(remOf(v));
    for (const [role, r] of Object.entries(TYPE_ROLES)) {
      for (const step of r.steps) {
        expect(TYPE_SCALE[step], `${role} ${step}`).toBeGreaterThanOrEqual(r.spec[0]);
        expect(TYPE_SCALE[step], `${role} ${step}`).toBeLessThanOrEqual(r.spec[1]);
      }
      if (r.command) expect(r.command.why.length, role).toBeGreaterThan(40);
    }
    expect(Object.keys(TYPE_ROLES)).toEqual(expect.arrayContaining(['body', 'compactTable', 'pageTitle', 'sectionHeading', 'smallLabel']));
  });

  it('space on a 4px base, with the 2px half step and the 1px hairline only', () => {
    expect(SPACE_BASE).toBe(4);
    expect(rootVar('--space')).toBe(`${SPACE_BASE}px`);
    for (const v of SPACE_SCALE) expect(v === 1 || v % 2 === 0, String(v)).toBe(true);
    expect(SPACE_SCALE.filter(v => v % SPACE_BASE === 0).length).toBeGreaterThan(SPACE_SCALE.length / 2);
  });

  it('size controls and cards within the specification, and Tailwind uses the same values', async () => {
    expect(CONTROL.height).toBeGreaterThanOrEqual(40); expect(CONTROL.height).toBeLessThanOrEqual(44);
    expect(CONTROL.cardRadius).toBeGreaterThanOrEqual(10); expect(CONTROL.cardRadius).toBeLessThanOrEqual(14);
    expect(rootVar('--tap')).toBe(`${CONTROL.height}px`);
    expect(rootVar('--control-h')).toBe(`${CONTROL.height}px`);
    expect(rootVar('--radius-card')).toBe(`${CONTROL.cardRadius}px`);
    const tw = (await import('../../../tailwind.config')).default as unknown as { theme: { extend: { fontSize: Record<string, [string, unknown]>; borderRadius: Record<string, string>; minHeight: Record<string, string> } } };
    const e = tw.theme.extend;
    expect(e.fontSize['2xs']![0]).toBe(remOf(TYPE_SCALE['2xs']));
    expect(e.fontSize.compact![0]).toBe(remOf(TYPE_SCALE.compact));
    expect(e.borderRadius.md).toBe(`${CONTROL.cardRadius}px`);
    expect(e.minHeight.tap).toBe(`${CONTROL.height}px`);
  });

  it('show keyboard focus at 3:1 on every ground: the amber ring or the ink halo beside it', () => {
    expect(rootVar('--focus-ring')).toBe(FOCUS.ring.slice(1).match(/../g)!.map(h => parseInt(h, 16)).join(' '));
    expect(rootVar('--focus-width')).toBe(`${FOCUS.width}px`);
    expect(rootVar('--focus-halo')).toBe(`${FOCUS.halo}px`);
    expect(FOCUS.width).toBeGreaterThanOrEqual(2);
    expect(css).toMatch(/:focus-visible \{\s*outline: var\(--focus-width\) solid rgb\(var\(--focus-ring\)\)/);
    expect(css).toMatch(/\.focus-ring:focus-visible \{\s*outline: var\(--focus-width\) solid rgb\(var\(--focus-ring\)\)/);
    const NON_TEXT = 3;
    for (const [name, g] of [['light', LIGHT], ['sov', SOV], ['console', CONSOLE], ['workspace', WORKSPACE]] as const) {
      for (const ground of ['--c-bg', '--c-surface', '--c-surface-2']) {
        const best = Math.max(contrast(FOCUS.ring, hx(g, ground)), contrast(hx(g, '--c-ink'), hx(g, ground)));
        expect(best, `focus on ${name} ${ground}`).toBeGreaterThanOrEqual(NON_TEXT);
      }
    }
    expect(contrast(FOCUS.ring, NIGHT.ground)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});
