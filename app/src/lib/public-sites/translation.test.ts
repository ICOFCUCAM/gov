import { describe, it, expect } from 'vitest';
import { REFERENCE_SITES } from './index';
import { translatableStrings, applyTranslation, coverage, exportXliff, importXliff, translationProblem, pathLabel } from './translation';

const police = REFERENCE_SITES.police!;

describe('translatable strings', () => {
  it('take prose and leave links, colours, glyphs, numbers and bare placeholders alone', () => {
    const s = translatableStrings(police);
    const paths = s.map(x => x.path);
    expect(paths).toContain('hero.headline.0');
    expect(paths).toContain('news.0.title');
    expect(paths).toContain('institution.emergencyButton.label');
    expect(paths.some(p => /\.(to|color|icon|crest|tone)$/.test(p))).toBe(false);
    expect(paths).not.toContain('statistics.0.value'); // "4,820"
    expect(paths).toContain('statistics.1.value'); // "8 min"
    expect(s.find(x => x.path === 'institution.emergencyButton.label')!.text).toBe('Emergency {emergency.police:999}');
  });
  it('label places readably', () => {
    expect(pathLabel('news.2.title')).toBe('News 3 · title');
    expect(pathLabel('hero.headline.0')).toBe('Opening · headline 1');
    expect(pathLabel('legalLine')).toBe('Legal line');
    expect(pathLabel('institution.emergencyButton.label')).toBe('Name · emergency button label');
  });
});

describe('applying translations', () => {
  it('uses a translation only while its source is the site\'s current text', () => {
    const entries = {
      'news.0.title': { source: 'New Anti-Fraud Unit Launched', target: 'Kitengo kipya cha kupambana na ulaghai' },
      'news.1.title': { source: 'An older headline', target: 'Kichwa cha zamani' },
    };
    const out = applyTranslation(police, entries);
    expect(out.news[0]!.title).toBe('Kitengo kipya cha kupambana na ulaghai');
    expect(out.news[1]!.title).toBe('Quarterly Force Report Published');
    expect(police.news[0]!.title).toBe('New Anti-Fraud Unit Launched');
    const c = coverage(police, entries);
    expect(c.translated).toBe(1);
    expect(c.stale).toEqual(['news.1.title']);
    expect(c.complete).toBe(false);
  });
  it('is complete when every string is translated from its current text', () => {
    const all = Object.fromEntries(translatableStrings(police).map(({ path, text }) => [path, { source: text, target: `«${text}»` }]));
    expect(coverage(police, all)).toMatchObject({ complete: true, missing: [], stale: [] });
  });
  it('requires placeholders to survive translation', () => {
    expect(translationProblem('Emergency {emergency.police:999}', 'Dharura {emergency.police:999}')).toBeNull();
    expect(translationProblem('Emergency {emergency.police:999}', 'Dharura 999')).toMatch(/placeholders/);
  });
});

describe('XLIFF 2.0', () => {
  it('round-trips a translation and refuses mismatches', () => {
    const xlf = exportXliff('police', police, 'sw', { 'hero.headline.0': { source: 'Safe Citizens,', target: 'Raia Salama,' } });
    expect(xlf).toContain('<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="sw">');
    expect(xlf).toContain('<unit id="hero.headline.0">');
    expect(xlf).toContain('<target>Raia Salama,</target>');
    expect(xlf).toContain('Keep unchanged: {emergency.police:999}');
    const filled = xlf
      .replace('<source>Sovereign Order</source>\n        <target></target>', '<source>Sovereign Order</source>\n        <target>Utaratibu wa Taifa &amp; Sheria</target>')
      .replace('<source>Emergency {emergency.police:999}</source>\n        <target></target>', '<source>Emergency {emergency.police:999}</source>\n        <target>Dharura 999</target>')
      .replace('<source>New Anti-Fraud Unit Launched</source>', '<source>Something else</source>')
      .replace(/(<source>Something else<\/source>\s*<target>)(<\/target>)/, '$1Kitu$2');
    const r = importXliff(filled, police, 'sw');
    if ('error' in r) throw new Error(r.error);
    expect(r.entries['hero.headline.1']).toEqual({ source: 'Sovereign Order', target: 'Utaratibu wa Taifa & Sheria' });
    expect(r.entries['hero.headline.0']!.target).toBe('Raia Salama,');
    expect(r.skipped).toEqual(expect.arrayContaining([
      { id: 'institution.emergencyButton.label', reason: expect.stringMatching(/placeholders/) },
      { id: 'news.0.title', reason: expect.stringMatching(/changed since/) },
    ]));
    expect(importXliff(filled, police, 'fr')).toEqual({ error: 'The file is for "sw", not "fr"' });
    expect(importXliff('<html/>', police, 'sw')).toEqual({ error: 'Not an XLIFF 2 file' });
  });
});
