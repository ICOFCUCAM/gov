// No button does nothing (the wiring audit, part 1 §8): every <button> in the
// apps, features and pages has a handler, submits its form, or is disabled
// with an explanation (NotYetButton); no link points at "#".
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotYetButton, NOT_YET } from './NotYetButton';

const SRC = path.resolve(__dirname, '../..');
const ROOTS = ['apps', 'components', 'app'];
const HANDLER = /^on(Click|PointerDown|MouseDown|KeyDown|Submit)$/;

function files(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else if (p.endsWith('.tsx') && !p.includes('.test.')) out.push(p);
  }
  return out;
}

function insideForm(n: ts.Node): boolean {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isJsxElement(p) && p.openingElement.tagName.getText() === 'form') return true;
  }
  return false;
}

function deadControls(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const at = (n: ts.Node) => `${path.relative(SRC, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(sf);
      const attrs = n.attributes.properties;
      const names = attrs.map(a => (ts.isJsxAttribute(a) ? a.name.getText(sf) : '...'));
      const attr = (k: string) => attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === k);
      if (tag === 'button') {
        const type = attr('type')?.getText(sf) ?? '';
        const ok = names.some(x => HANDLER.test(x)) || names.includes('disabled') || names.includes('...')
          || names.includes('form') || names.includes('formAction') || /submit|reset/.test(type)
          || (!type && insideForm(n));
        if (!ok) found.push(`${at(n)} button without an action`);
      }
      if (tag === 'a' || tag === 'Link') {
        const h = attr('href')?.getText(sf).replace(/\s/g, '');
        if (h && /^href=(["'`]#["'`]|\{["'`]#["'`]\})$/.test(h)) found.push(`${at(n)} link to "#"`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe('buttons and links that do nothing', () => {
  it('are wired, or disabled with a plain explanation', () => {
    const dead = ROOTS.flatMap(r => files(path.join(SRC, r))).flatMap(deadControls);
    expect(dead).toEqual([]);
  });

  it('NotYetButton is disabled and says why, on hover and to screen readers', () => {
    const html = renderToStaticMarkup(React.createElement(NotYetButton, { reason: 'no radio system is connected', className: 'x' }, 'Open radio console'));
    expect(html).toContain('disabled');
    expect(html).toContain(`title="${NOT_YET}: no radio system is connected"`);
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('Open radio console');
  });
});
