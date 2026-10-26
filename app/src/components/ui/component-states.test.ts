// The component-state test (plan step I10; specification Part 6 §H, plan
// §3.3): every state the catalogue lists (lib/ui/states.ts) is rendered by a
// shared component on every ground of the gallery (/gov/help/states), with an
// accessible name, a word and a shape (never colour alone), and text that
// reads at 4.5:1 on every ground. Keyboard focus and the rendered contrast
// are checked again in a browser by app/scripts/audit-console.mjs.
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { StateGallery, GALLERY_GROUNDS } from '@/components/features/StateGallery';
import { StateNotice, ErrorSummary, LoadingState, TONE_TEXT, type NoticeState } from './States';
import { Button } from './Button';
import { TextField } from './Field';
import { DataTable } from './DataSystem';
import { UI_STATES, type StateTone } from '@/lib/ui/states';
import { LIGHT, SOV, CONSOLE, WORKSPACE, hexOf, type Ground } from '@/lib/theme/tokens';
import { contrast, AA } from '@/apps/_shared/public/design/contrast';

const html = renderToStaticMarkup(React.createElement(StateGallery));
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** Each ground's section of the gallery. */
const grounds = Object.fromEntries(GALLERY_GROUNDS.map(g => {
  const at = html.indexOf(`data-ground="${g.key}"`);
  const next = GALLERY_GROUNDS.map(x => html.indexOf(`data-ground="${x.key}"`)).filter(i => i > at).sort((a, b) => a - b)[0] ?? html.length;
  return [g.key, html.slice(html.lastIndexOf('<section', at), next)];
}));

describe('the component-state gallery (plan I10)', () => {
  it('draws every state of the catalogue on every ground', () => {
    expect(Object.keys(grounds)).toEqual(['console', 'light', 'workspace']);
    for (const [g, part] of Object.entries(grounds)) {
      for (const s of UI_STATES) {
        if (s.id === 'focus') continue; // a browser state: audit-console.mjs focuses every control of this page
        expect(part.includes(`data-state="${s.id}"`), `${s.id} on the ${g} ground`).toBe(true);
        expect(part.includes(`data-state-word="${s.id}"`), `the word for ${s.id} on the ${g} ground`).toBe(true);
      }
    }
  });

  it('covers every state the specification and the plan name', () => {
    const ids = UI_STATES.map(s => s.id);
    // Specification Part 6 §H: normal, loading, empty, unavailable, denied, failed and recovery; the examples after it.
    // Plan §3.3: loading, empty, partial, error, refused with reason, waiting for a second official, sample, simulated, not connected, offline, stale.
    // The I10 brief: default, hover/focus-visible, disabled, loading, empty, error, refused.
    for (const id of ['default', 'focus', 'disabled', 'loading', 'empty', 'error', 'unavailable', 'refused', 'validation', 'conflict', 'stale', 'partial', 'integrity', 'session', 'waiting', 'sample', 'simulated', 'not-connected', 'offline']) expect(ids).toContain(id);
    for (const s of UI_STATES) { expect(s.word.length, s.id).toBeGreaterThan(2); expect(s.shape.length, s.id).toBeGreaterThan(0); expect(s.source, s.id).toBeTruthy(); }
    expect(new Set(UI_STATES.map(s => s.word)).size).toBe(UI_STATES.length);
  });

  it('names every control, table, link and live region', () => {
    for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) expect(text(m[2]!) || /aria-label="[^"]+"/.test(m[1]!), m[0].slice(0, 80)).toBeTruthy();
    for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*\bid="([^"]+)"/g)) expect(html.includes(`for="${m[2]}"`), `label for ${m[2]}`).toBe(true);
    expect([...html.matchAll(/<(input|select|textarea)\b(?![^>]*\bid=)/g)]).toEqual([]);
    for (const m of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) expect(m[1]!, 'every table has a caption').toMatch(/<caption[^>]*>[^<]+<\/caption>/);
    for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) expect(text(m[1]!), m[0].slice(0, 80)).not.toBe('');
    for (const m of html.matchAll(/<[a-z]+\b[^>]*role="(alert|status)"[^>]*>/g)) {
      const at = html.indexOf(m[0]);
      expect(/aria-label="[^"]+"/.test(m[0]) || text(html.slice(at, at + 400)).length > 3, m[0].slice(0, 80)).toBe(true);
    }
  });

  it('ties every field error to its field, and the summary links to it', () => {
    for (const part of Object.values(grounds)) {
      const input = /<input\b[^>]*aria-invalid="true"[^>]*>/.exec(part)?.[0] ?? '';
      const id = /\bid="([^"]+)"/.exec(input)?.[1];
      const described = /aria-describedby="([^"]+)"/.exec(input)?.[1]?.split(' ') ?? [];
      expect(id).toBeTruthy();
      for (const d of described) expect(part.includes(`id="${d}"`), d).toBe(true);
      expect(described.some(d => d.endsWith('-error'))).toBe(true);
      expect(part).toContain(`href="#${id}"`);
    }
  });

  it('gives every button a hover state, and a working state that cannot be pressed', () => {
    for (const m of html.matchAll(/<button\b[^>]*class="([^"]*)"/g)) expect(m[1], m[0].slice(0, 80)).toMatch(/hover:/);
    const busy = renderToStaticMarkup(React.createElement(Button, { busy: true }, 'Sending'));
    expect(busy).toMatch(/disabled=""/); expect(busy).toMatch(/aria-busy="true"/); expect(text(busy)).toContain('Sending');
  });

  it('never invents a last update: "none recorded" unless the caller has the time', () => {
    const none = renderToStaticMarkup(React.createElement(StateNotice, { state: 'unavailable', title: 'Source not responding', lastSuccess: null }));
    expect(text(none)).toContain('Last successful update: none recorded');
    const at = renderToStaticMarkup(React.createElement(StateNotice, { state: 'stale', title: 'Out of date', lastSuccess: '2026-03-04T05:06:00Z' }));
    expect(at).toContain('dateTime="2026-03-04T05:06:00Z"');
    expect(text(at)).toContain('2026-03-04 05:06 UTC');
  });

  it('announces each state the way the catalogue says, with its word', () => {
    const notices: NoticeState[] = ['error', 'unavailable', 'refused', 'conflict', 'stale', 'partial', 'integrity', 'session', 'waiting', 'offline'];
    for (const id of notices) {
      const s = UI_STATES.find(x => x.id === id)!;
      const out = renderToStaticMarkup(React.createElement(StateNotice, { state: id, title: 'Title' }));
      expect(out, id).toContain(s.live === 'alert' ? 'role="alert"' : 'role="status"');
      expect(text(out), id).toContain(s.word);
      expect(out, id).toContain(`aria-label="${s.word}: Title"`);
    }
    expect(renderToStaticMarkup(React.createElement(LoadingState, { label: 'Loading cases' }))).toMatch(/role="status"[^>]*aria-busy="true"/);
    expect(renderToStaticMarkup(React.createElement(ErrorSummary, { errors: [] }))).toBe('');
    const t = renderToStaticMarkup(React.createElement(DataTable<{ id: string }>, { columns: [], rows: [], loading: true, caption: 'Cases', rowKey: r => r.id }));
    expect(t).toContain('data-state="loading"');
    const f = renderToStaticMarkup(React.createElement(TextField, { label: 'Name', name: 'n', error: 'Enter a name' }));
    expect(f).toMatch(/aria-invalid="true"/); expect(text(f)).toContain('Error: Enter a name');
  });
});

describe('state colours on every ground (plan I10)', () => {
  const hx = (g: Ground, k: string) => hexOf(g[k as keyof Ground]!);
  /** The ground's status inks: the console takes the .sov status colours under its own grounds. */
  const GROUNDS: [string, Ground][] = [['light', LIGHT], ['workspace', WORKSPACE], ['console', { ...SOV, ...CONSOLE }]];
  const toneInk = (g: Ground, tone: StateTone) => hx(g, { neutral: '--c-ink-soft', info: '--c-link', ok: '--c-ok', warn: '--c-warn', alert: '--c-alert' }[tone]);
  const mix = (fg: string, bg: string, a: number) => {
    const p = (h: string) => h.slice(1).match(/../g)!.map(x => parseInt(x, 16));
    const [f, b] = [p(fg), p(bg)];
    return `#${f.map((v, i) => Math.round(v * a + b[i]! * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
  };

  it('reads every state word at 4.5:1 on the panel it sits on', () => {
    expect(Object.keys(TONE_TEXT).sort()).toEqual(['alert', 'info', 'neutral', 'ok', 'warn']);
    for (const [name, g] of GROUNDS) {
      for (const ground of ['--c-bg', '--c-surface', '--c-surface-2']) {
        for (const tone of Object.keys(TONE_TEXT) as StateTone[]) {
          expect(contrast(toneInk(g, tone), hx(g, ground)), `${name} ${tone} on ${ground}`).toBeGreaterThanOrEqual(AA);
        }
      }
    }
  });

  // Pill.tsx tints its fill with the tone at 10% (bg-ok/10 …); at 15% the light warn badge read 4.26:1.
  const PILL_FILL = 0.1;
  it('reads status badges at 4.5:1 on their own tinted fill', () => {
    expect(fs.readFileSync(path.join(__dirname, 'Pill.tsx'), 'utf8')).toMatch(/bg-warn\/10 text-warn/);
    for (const [name, g] of GROUNDS) {
      for (const tone of ['ok', 'warn', 'alert'] as const) {
        const fill = mix(toneInk(g, tone), hx(g, '--c-surface'), PILL_FILL);
        expect(contrast(toneInk(g, tone), fill), `${name} ${tone} badge`).toBeGreaterThanOrEqual(AA);
      }
    }
  });
});
