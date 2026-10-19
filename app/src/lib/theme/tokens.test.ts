import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LIGHT, SOV, CONSOLE, STATUS, INFO, INSTITUTIONAL, NIGHT, DECISION_CLASS, hexOf, type Ground } from './tokens';
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
    expect(TONE).toEqual(STATUS);
    for (const [k, v] of Object.entries(CONSOLE)) expect((PALETTE as Record<string, string>)[k]).toBe(v);
  });

  it('give every text colour 4.5:1 on every ground it is drawn on', () => {
    for (const [name, g] of [['light', LIGHT], ['sov', SOV], ['console', CONSOLE]] as const) {
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
