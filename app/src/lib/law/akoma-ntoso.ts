// Reading and writing legal texts (docs/GOVERNMENT_OPERATING_MODEL.md §5.2,
// directions 7.4): Akoma Ntoso (OASIS LegalDocML) XML, the form parliaments
// and gazettes publish structured texts in, and a plain CSV of provisions.
// The laws register's own model does not depend on either: these turn a file
// into provisions (checked by checkProvisions) and a version back into XML.
// Only what the register keeps is read (the work's identity and dates, the
// title, and the hierarchy of numbered units with their eIds, numbers,
// headings and text); no document type declarations or entities are
// accepted.

import { XMLParser } from 'fast-xml-parser';
import { parseCsv } from '@/lib/twin/csv';
import type { Provision, LegalInstrument, LegalVersion } from './register';

/** Units that become provisions, outermost first. */
const UNITS = new Set(['part', 'title', 'chapter', 'section', 'article', 'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause', 'point', 'rule', 'division', 'subdivision', 'list', 'item']);
/** Elements whose text is a unit's own text. */
const TEXT = new Set(['content', 'intro', 'wrapUp', 'alinea']);
export const MAX_XML_BYTES = 10 * 1024 * 1024;

type Node = Record<string, unknown>;
const tagOf = (n: Node) => Object.keys(n).find(k => k !== ':@');
const attrs = (n: Node) => (n[':@'] ?? {}) as Record<string, string>;
const kids = (n: Node) => { const t = tagOf(n); return t && Array.isArray(n[t]) ? (n[t] as Node[]) : []; };

function textOf(nodes: Node[]): string {
  let out = '';
  for (const n of nodes) {
    if ('#text' in n) out += ` ${String(n['#text'])}`;
    else out += ` ${textOf(kids(n))}`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

export interface ReadText {
  provisions: Provision[];
  work?: { uri?: string; title?: string; date?: string; dateName?: string; language?: string };
}

/** Read an Akoma Ntoso document's provisions (and what it says about the work). */
export function readAkomaNtoso(xml: string): ReadText | { error: string } {
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) return { error: 'The file is larger than 10 MB' };
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return { error: 'Documents with a DOCTYPE or entity declarations are not accepted' };
  let tree: Node[];
  try {
    tree = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', preserveOrder: true, trimValues: true, processEntities: true }).parse(xml) as Node[];
  } catch (e) { return { error: `Not well-formed XML: ${(e as Error).message}` }; }
  const root = tree.find(n => tagOf(n) === 'akomaNtoso');
  if (!root) return { error: 'Not an Akoma Ntoso document (no akomaNtoso element)' };
  const doc = kids(root).find(n => tagOf(n) && !('#text' in n));
  if (!doc) return { error: 'The document is empty' };

  const work: ReadText['work'] = {};
  const find = (nodes: Node[], tag: string): Node | undefined => {
    for (const n of nodes) { if (tagOf(n) === tag) return n; const f = find(kids(n), tag); if (f) return f; }
    return undefined;
  };
  const frbrWork = find(kids(doc), 'FRBRWork');
  if (frbrWork) {
    const thisN = kids(frbrWork).find(n => tagOf(n) === 'FRBRthis');
    const date = kids(frbrWork).find(n => tagOf(n) === 'FRBRdate');
    if (thisN) work.uri = attrs(thisN).value;
    if (date) { work.date = attrs(date).date; work.dateName = attrs(date).name; }
  }
  const lang = find(kids(doc), 'FRBRlanguage');
  if (lang) work.language = attrs(lang).language;
  const title = find(kids(doc), 'docTitle') ?? find(kids(doc), 'shortTitle');
  if (title) work.title = textOf(kids(title));

  const body = kids(doc).find(n => tagOf(n) === 'body' || tagOf(n) === 'mainBody');
  if (!body) return { error: 'The document has no body' };
  const out: Provision[] = [];
  const walk = (nodes: Node[], parent?: string) => {
    for (const n of nodes) {
      const tag = tagOf(n);
      if (!tag || '#text' in n) continue;
      if (UNITS.has(tag)) {
        const a = attrs(n);
        const eId = a.eId ?? a.id;
        const children = kids(n);
        const num = children.find(c => tagOf(c) === 'num');
        const heading = children.find(c => tagOf(c) === 'heading');
        const text = children.filter(c => TEXT.has(tagOf(c) ?? '')).map(c => textOf(kids(c))).filter(Boolean).join(' ');
        if (!eId) { walk(children, parent); continue; }
        const numText = num ? textOf(kids(num)).replace(/\.$/, '') : eId;
        const headingText = heading ? textOf(kids(heading)) : undefined;
        out.push({ eId, num: numText, ...(headingText ? { heading: headingText } : {}), text: text || headingText || numText, ...(parent ? { parent } : {}) });
        walk(children, eId);
      } else walk(kids(n), parent);
    }
  };
  walk(kids(body));
  if (!out.length) return { error: 'No numbered provisions with an eId were found in the body' };
  return { provisions: out, work };
}

/** Read provisions from a CSV with the columns eId, num, heading, text, parent. */
export function readProvisionsCsv(text: string): ReadText | { error: string } {
  const rows = parseCsv(text);
  if (!rows.length) return { error: 'The CSV has no rows' };
  const keys = Object.keys(rows[0]!);
  const key = (n: string) => keys.find(k => k.trim().toLowerCase() === n.toLowerCase());
  const k = { eId: key('eId'), num: key('num'), heading: key('heading'), text: key('text'), parent: key('parent') };
  if (!k.eId || !k.num || !k.text) return { error: 'The CSV needs the columns eId, num and text (heading and parent are optional)' };
  return {
    provisions: rows.filter(r => Object.values(r).some(c => c.trim())).map(r => ({
      eId: (r[k.eId!] ?? '').trim(), num: (r[k.num!] ?? '').trim(), text: r[k.text!] ?? '',
      ...(k.heading && r[k.heading]?.trim() ? { heading: r[k.heading]!.trim() } : {}),
      ...(k.parent && r[k.parent]?.trim() ? { parent: r[k.parent]!.trim() } : {}),
    })),
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A version as an Akoma Ntoso act document (structure, numbers, headings and text), or, with `doc: 'bill'`,
 * a bill as the legislature recorded it (lib/legislature/register.ts), with the steps of its life so far
 * (introduction, readings, votes, assent, publication) as lifecycle events.
 */
export function toAkomaNtoso(inst: Pick<LegalInstrument, 'id' | 'title' | 'type'>, v: Pick<LegalVersion, 'language' | 'dates' | 'provisions'>, opts: { doc?: 'act' | 'bill'; lifecycle?: { date: string; name: string }[] } = {}): string {
  const doc = opts.doc ?? 'act';
  const events = (opts.lifecycle ?? []).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  const ref = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
  const lifecycle = events.length
    ? `      <lifecycle source="#civicos">\n${events.map((e, i) => `        <eventRef eId="evt_${i + 1}" date="${esc(e.date)}" source="#civicos" refersTo="#${esc(ref(e.name))}"/>\n`).join('')}      </lifecycle>\n`
    : '';
  const byParent = new Map<string | undefined, Provision[]>();
  for (const p of v.provisions) byParent.set(p.parent, [...(byParent.get(p.parent) ?? []), p]);
  const tag = (p: Provision) => {
    const t = p.eId.split('__').pop()!.split('_')[0]!;
    return UNITS.has(t) ? t : 'section';
  };
  const unit = (p: Provision, depth: number): string => {
    const pad = '  '.repeat(depth);
    const inner = (byParent.get(p.eId) ?? []).map(c => unit(c, depth + 1)).join('');
    return `${pad}<${tag(p)} eId="${esc(p.eId)}">\n${pad}  <num>${esc(p.num)}</num>\n${p.heading ? `${pad}  <heading>${esc(p.heading)}</heading>\n` : ''}${p.text && p.text !== p.heading ? `${pad}  <content><p>${esc(p.text)}</p></content>\n` : ''}${inner}${pad}</${tag(p)}>\n`;
  };
  const lang = esc(v.language);
  return `<?xml version="1.0" encoding="UTF-8"?>
<akomaNtoso xmlns="http://docs.oasis-open.org/legaldocml/ns/akn/3.0">
  <${doc} name="${esc(inst.type)}">
    <meta>
      <identification source="#civicos">
        <FRBRWork><FRBRthis value="${esc(inst.id)}"/><FRBRuri value="${esc(inst.id)}"/><FRBRdate date="${esc(v.dates.adopted ?? v.dates.inForce)}" name="${v.dates.adopted ? 'adoption' : 'inForce'}"/><FRBRauthor href="#legislator"/><FRBRcountry value="${esc(inst.id.split('/')[2] ?? '')}"/></FRBRWork>
        <FRBRExpression><FRBRthis value="${esc(inst.id)}/${lang}@${esc(v.dates.inForce)}"/><FRBRuri value="${esc(inst.id)}/${lang}@${esc(v.dates.inForce)}"/><FRBRdate date="${esc(v.dates.inForce)}" name="${doc === 'bill' ? 'version' : 'inForce'}"/><FRBRauthor href="#legislator"/><FRBRlanguage language="${lang}"/></FRBRExpression>
      </identification>
${lifecycle}    </meta>
    <preface><p><docTitle>${esc(inst.title)}</docTitle></p></preface>
    <body>
${(byParent.get(undefined) ?? []).map(p => unit(p, 3)).join('')}    </body>
  </${doc}>
</akomaNtoso>
`;
}
