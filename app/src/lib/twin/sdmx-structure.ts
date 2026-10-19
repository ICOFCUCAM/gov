// SDMX structures from the statistics office's own registry (review I6). A
// twin source in an SDMX format may name the office's SDMX REST API
// (`sdmx.registry`, e.g. https://stats.example.go.ke/rest) and the dataflow
// its file belongs to (`sdmx.dataflow`, AGENCY:ID(VERSION)). Each run then
// asks the registry for the dataflow with its data structure definition
// (DSD), concepts and code lists, one SDMX REST structure query:
//
//   GET {registry}/dataflow/{agency}/{id}/{version}?references=descendants&detail=full
//
// through safeFetchText, from the source's own host only (the host of the
// source's address, or of the registry for an uploaded source; the
// registration refuses a registry on another host), and uses it:
//
//  - to validate: every dimension and coded attribute of every observation
//    must be a code of its code list (a row with a code the office does not
//    define is refused, naming the code and the list), and the file's
//    dataflow must be the one the source names;
//  - to label: the run keeps the code lists' names for the codes it saw (the
//    metric, the areas, the units …), with the DSD's identity and the SHA-256
//    of the structure message as read, so the import says what each code
//    meant on the day.
//
// Readers: SDMX-ML 2.1 structure messages (what every SDMX registry answers)
// and SDMX-JSON structure messages (1.0 and 2.0). A registry that cannot be
// read fails the run with the reason: values are never imported unchecked
// when the source asked for checking. No XML library; DOCTYPEs and entity
// declarations are refused.

import { createHash } from 'node:crypto';
import { safeFetchText } from '@/lib/net/safe-fetch';

export interface SdmxRef { agency: string; id: string; version: string }
export interface SdmxCodelist extends SdmxRef { name?: string; codes: Record<string, string> }
export interface SdmxComponent { id: string; role: 'dimension' | 'time' | 'attribute' | 'measure'; concept?: string; codelist?: string }
export interface SdmxStructure {
  flow?: SdmxRef & { name?: string; structure?: string };
  dsd: SdmxRef & { name?: string };
  components: SdmxComponent[];
  /** By `AGENCY:ID(VERSION)`. */
  codelists: Record<string, SdmxCodelist>;
}

/** What a run keeps of the structure it was checked against. */
export interface SdmxStructureUse {
  dataflow: string;
  dsd: string;
  url: string;
  sha256: string;
  fetchedAt: string;
  /** For each coded component, the labels of the codes this run saw (at most LABELS_PER_COMPONENT each). */
  labels: Record<string, Record<string, string>>;
}

const LABELS_PER_COMPONENT = 200;
export const refKey = (r: SdmxRef) => `${r.agency}:${r.id}(${r.version})`;

/** AGENCY:ID(VERSION), AGENCY:ID (latest), or AGENCY,ID,VERSION. */
export function parseDataflowRef(v: string | undefined): SdmxRef | { error: string } {
  const s = (v ?? '').trim();
  const m = /^([A-Za-z][\w.-]*):([A-Za-z][\w-]*)(?:\(([\w.+*~-]+)\))?$/.exec(s) ?? /^([A-Za-z][\w.-]*),([A-Za-z][\w-]*)(?:,([\w.+*~-]+))?$/.exec(s);
  if (!m) return { error: 'The dataflow is AGENCY:ID(VERSION), e.g. KNBS:DF_POP(1.0)' };
  return { agency: m[1]!, id: m[2]!, version: m[3] ?? 'latest' };
}

/** The SDMX REST structure query for a dataflow with its DSD, concepts and code lists. */
export function structureQuery(registry: string, flow: SdmxRef): string {
  const base = registry.replace(/\/+$/, '');
  return `${base}/dataflow/${encodeURIComponent(flow.agency)}/${encodeURIComponent(flow.id)}/${encodeURIComponent(flow.version)}?references=descendants&detail=full`;
}

/** An SDMX URN (…Codelist=AGENCY:ID(VERSION), …Concept=AGENCY:SCHEME(VERSION).ID) as a reference. */
function fromUrn(urn: string): (SdmxRef & { item?: string }) | undefined {
  const m = /=([^:]+):([^(]+)\(([^)]+)\)(?:\.(.+))?$/.exec(urn.trim());
  return m ? { agency: m[1]!, id: m[2]!, version: m[3]!, ...(m[4] ? { item: m[4] } : {}) } : undefined;
}

/** Pick a name: the preferred language, else English, else the first. */
function pickName(names: { lang?: string; text: string }[], lang: string): string | undefined {
  return (names.find(n => n.lang === lang) ?? names.find(n => n.lang === 'en') ?? names[0])?.text;
}

// ── SDMX-ML 2.1 structure message ─────────────────────────────────────────

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescape = (v: string) => v.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m));
function attrs(t: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of t.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]!] = unescape(m[3] ?? m[4] ?? '');
  return out;
}

interface Pending { names: { lang?: string; text: string }[] }

function readStructureXml(xml: string, lang: string): SdmxStructure | { error: string } {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return { error: 'A structure message with a DOCTYPE or entity declarations is refused' };
  const body = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '');
  const stack: string[] = [];
  const flows: (SdmxRef & Pending & { structure?: string })[] = [];
  const dsds: (SdmxRef & Pending & { components: SdmxComponent[] })[] = [];
  const lists: (SdmxCodelist & Pending & { codeNames: Record<string, Pending['names']> })[] = [];
  const concepts = new Map<string, string>(); // concept id → codelist key (core representation)
  let flow: (typeof flows)[number] | null = null, dsd: (typeof dsds)[number] | null = null, list: (typeof lists)[number] | null = null;
  let code: string | null = null, comp: SdmxComponent | null = null, concept: string | null = null;
  let name: { lang?: string; text: string } | null = null, urn: string | null = null;
  const refOf = (a: Record<string, string>): SdmxRef => ({ agency: a.agencyID ?? '', id: a.id ?? '', version: a.version ?? 'latest' });
  // A reference (a Ref element, or a URN element's text) placed by the element it sits in.
  const placeRef = (r: SdmxRef & { item?: string }, parent: string | undefined, grand: string | undefined, cls?: string) => {
    if (parent === 'Enumeration' && (cls === undefined || cls === 'Codelist')) {
      if (comp) comp.codelist = refKey(r); else if (concept) concepts.set(concept, refKey(r));
    } else if (parent === 'ConceptIdentity' && comp) comp.concept = r.item ?? r.id;
    else if (parent === 'Structure' && grand === 'Dataflow' && flow) flow.structure = refKey(r);
  };
  for (const m of body.matchAll(/<(\/?)(?:[\w-]+:)?([\w.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g)) {
    const [, close, local, at = '', self, text] = m;
    if (text !== undefined) {
      if (name) name.text += unescape(text);
      else if (urn !== null) urn += text;
      continue;
    }
    if (close) {
      if (local === 'Name' && name) {
        const owner = code !== null && list ? (list.codeNames[code] ??= []) : comp ? null : concept ? null : list ? list.names : dsd ? dsd.names : flow ? flow.names : null;
        if (owner) owner.push({ ...name, text: name.text.trim() });
        name = null;
      } else if (local === 'URN' && urn !== null) {
        const r = fromUrn(urn);
        const cls = /\.Codelist=/.test(urn) ? 'Codelist' : /\.Concept=/.test(urn) ? 'Concept' : undefined;
        urn = null;
        // The URN element is on the stack: its parent is the one below it.
        if (r) placeRef(r, stack[stack.length - 2], stack[stack.length - 3], cls);
      } else if (local === 'Code') code = null;
      else if (local === 'Codelist') list = null;
      else if (local === 'Dataflow') flow = null;
      else if (local === 'DataStructure') dsd = null;
      else if (local === 'Concept') concept = null;
      else if (['Dimension', 'TimeDimension', 'Attribute', 'PrimaryMeasure', 'Measure'].includes(local!) && comp) comp = null;
      const i = stack.lastIndexOf(local!);
      if (i >= 0) stack.length = i;
      continue;
    }
    const a = attrs(at);
    if (local === 'Ref') { placeRef({ ...refOf(a), ...(a.maintainableParentID ? { id: a.maintainableParentID, item: a.id } : {}) }, stack[stack.length - 1], stack[stack.length - 2], a.class); continue; }
    if (!self) stack.push(local!);
    switch (local) {
      case 'Dataflow': if (stack.includes('Dataflows')) { flow = { ...refOf(a), names: [] }; flows.push(flow); } break;
      case 'DataStructure': if (stack.includes('DataStructures')) { dsd = { ...refOf(a), names: [], components: [] }; dsds.push(dsd); } break;
      case 'Codelist': if (stack.includes('Codelists')) { list = { ...refOf(a), names: [], codes: {}, codeNames: {} }; lists.push(list); } break;
      case 'Code': if (list) { code = a.id ?? null; if (code) list.codes[code] = code; if (self) code = null; } break;
      case 'Concept': if (stack.includes('ConceptScheme')) concept = a.id ?? null; break;
      case 'Dimension': case 'TimeDimension': case 'Attribute': case 'PrimaryMeasure': case 'Measure':
        if (dsd) { comp = { id: a.id ?? '', role: local === 'Dimension' ? 'dimension' : local === 'TimeDimension' ? 'time' : local === 'Attribute' ? 'attribute' : 'measure' }; dsd.components.push(comp); if (self) comp = null; }
        break;
      case 'Name': if (!self) name = { lang: a['xml:lang'], text: '' }; break;
      case 'URN': if (!self) urn = ''; break;
    }
  }
  if (!dsds.length) return { error: 'The registry\'s answer has no data structure definition' };
  for (const l of lists) {
    l.name = pickName(l.names, lang);
    for (const [c, ns] of Object.entries(l.codeNames)) l.codes[c] = pickName(ns, lang) ?? c;
  }
  return assemble(flows.map(f => ({ ...f, name: pickName(f.names, lang) })), dsds.map(d => ({ ...d, name: pickName(d.names, lang) })), lists, concepts);
}

// ── SDMX-JSON structure message (1.0, 2.0) ────────────────────────────────

interface JsonArtefact { id?: string; agencyID?: string; version?: string; name?: string; names?: Record<string, string> }
interface JsonComp { id?: string; conceptIdentity?: string; localRepresentation?: { enumeration?: string } }
interface JsonStructureMsg {
  data?: {
    dataflows?: (JsonArtefact & { structure?: string })[];
    dataStructures?: (JsonArtefact & { dataStructureComponents?: { dimensionList?: { dimensions?: JsonComp[]; timeDimensions?: JsonComp[]; timeDimension?: JsonComp }; attributeList?: { attributes?: JsonComp[] }; measureList?: { primaryMeasure?: JsonComp; measures?: JsonComp[] } } })[];
    codelists?: (JsonArtefact & { codes?: (JsonArtefact & { id: string })[] })[];
    conceptSchemes?: (JsonArtefact & { concepts?: (JsonArtefact & { coreRepresentation?: { enumeration?: string } })[] })[];
  };
}

const jsonName = (a: JsonArtefact, lang: string) => a.names?.[lang] ?? a.names?.en ?? a.name ?? (a.names ? Object.values(a.names)[0] : undefined);
const jsonRef = (a: JsonArtefact): SdmxRef => ({ agency: a.agencyID ?? '', id: a.id ?? '', version: a.version ?? 'latest' });

function readStructureJson(text: string, lang: string): SdmxStructure | { error: string } {
  let msg: JsonStructureMsg;
  try { msg = JSON.parse(text.replace(/^﻿/, '')); } catch { return { error: 'The registry\'s answer is not valid JSON' }; }
  const d = msg.data ?? {};
  if (!d.dataStructures?.length) return { error: 'The registry\'s answer has no data structure definition' };
  const concepts = new Map<string, string>();
  for (const cs of d.conceptSchemes ?? []) for (const c of cs.concepts ?? []) {
    const r = c.coreRepresentation?.enumeration ? fromUrn(c.coreRepresentation.enumeration) : undefined;
    if (c.id && r) concepts.set(c.id, refKey(r));
  }
  const lists = (d.codelists ?? []).map(l => ({ ...jsonRef(l), name: jsonName(l, lang), codes: Object.fromEntries((l.codes ?? []).map(c => [c.id, jsonName(c, lang) ?? c.id])) }));
  const comp = (c: JsonComp, role: SdmxComponent['role']): SdmxComponent => {
    const e = c.localRepresentation?.enumeration ? fromUrn(c.localRepresentation.enumeration) : undefined;
    const ci = c.conceptIdentity ? fromUrn(c.conceptIdentity) : undefined;
    return { id: c.id ?? '', role, ...(ci ? { concept: ci.item ?? ci.id } : {}), ...(e ? { codelist: refKey(e) } : {}) };
  };
  const dsds = d.dataStructures.map(s => {
    const k = s.dataStructureComponents ?? {};
    const times = k.dimensionList?.timeDimensions ?? (k.dimensionList?.timeDimension ? [k.dimensionList.timeDimension] : []);
    const measures = k.measureList?.measures ?? (k.measureList?.primaryMeasure ? [k.measureList.primaryMeasure] : []);
    return {
      ...jsonRef(s), name: jsonName(s, lang),
      components: [...(k.dimensionList?.dimensions ?? []).map(c => comp(c, 'dimension')), ...times.map(c => comp(c, 'time')), ...(k.attributeList?.attributes ?? []).map(c => comp(c, 'attribute')), ...measures.map(c => comp(c, 'measure'))],
    };
  });
  const flows = (d.dataflows ?? []).map(f => { const r = f.structure ? fromUrn(f.structure) : undefined; return { ...jsonRef(f), name: jsonName(f, lang), ...(r ? { structure: refKey(r) } : {}) }; });
  return assemble(flows, dsds, lists, concepts);
}

/** The flow, its DSD (the one it names, else the only one) and the code lists, with each component's list resolved. */
function assemble(flows: (SdmxRef & { name?: string; structure?: string })[], dsds: (SdmxRef & { name?: string; components: SdmxComponent[] })[], lists: SdmxCodelist[], concepts: Map<string, string>): SdmxStructure {
  const flow = flows[0];
  const dsd = (flow?.structure && dsds.find(x => sameArtefact(refKey(x), flow.structure!))) || dsds[0]!;
  const codelists: Record<string, SdmxCodelist> = {};
  for (const l of lists) codelists[refKey(l)] = { agency: l.agency, id: l.id, version: l.version, ...(l.name ? { name: l.name } : {}), codes: l.codes };
  const components = dsd.components.map(c => {
    const want = c.codelist ?? (c.concept ? concepts.get(c.concept) : undefined);
    const found = want ? Object.keys(codelists).find(k => sameArtefact(k, want)) : undefined;
    return { id: c.id.toUpperCase(), role: c.role, ...(c.concept ? { concept: c.concept } : {}), ...(found ? { codelist: found } : {}) };
  });
  return { ...(flow ? { flow: { agency: flow.agency, id: flow.id, version: flow.version, ...(flow.name ? { name: flow.name } : {}), ...(flow.structure ? { structure: flow.structure } : {}) } } : {}), dsd: { agency: dsd.agency, id: dsd.id, version: dsd.version, ...(dsd.name ? { name: dsd.name } : {}) }, components, codelists };
}

/** Two artefact keys name the same thing: same agency and id, and the same version unless one is open (latest, *, +). */
function sameArtefact(a: string, b: string): boolean {
  const p = (k: string) => /^([^:]*):([^(]*)\(([^)]*)\)$/.exec(k);
  const x = p(a), y = p(b);
  if (!x || !y) return a === b;
  const open = (v: string) => v === 'latest' || v.includes('*') || v.includes('+') || v === '';
  return x[1] === y[1] && x[2] === y[2] && (x[3] === y[3] || open(x[3]!) || open(y[3]!));
}

/** A structure message as text, in either format. */
export function readStructure(text: string, lang = 'en'): SdmxStructure | { error: string } {
  const t = text.replace(/^﻿/, '').trimStart();
  if (t.startsWith('{')) return readStructureJson(t, lang);
  if (t.startsWith('<')) return readStructureXml(t, lang);
  return { error: 'The registry did not answer with an SDMX structure message (SDMX-ML or SDMX-JSON)' };
}

export const STRUCTURE_ACCEPT = 'application/vnd.sdmx.structure+xml;version=2.1, application/vnd.sdmx.structure+json;version=1.0;q=0.9, application/xml;q=0.8, application/json;q=0.7';

/**
 * Fetch and read a dataflow's structure from the registry, from `host` only.
 * Throws with the reason when it cannot be fetched or read.
 */
export async function fetchStructure(registry: string, dataflow: string, o: { host: string; lang?: string; fetch?: typeof fetch; resolve?: (host: string) => Promise<string[]> }): Promise<{ structure: SdmxStructure; url: string; sha256: string }> {
  const ref = parseDataflowRef(dataflow);
  if ('error' in ref) throw new Error(ref.error);
  const url = structureQuery(registry, ref);
  if (new URL(url).host !== o.host) throw new Error(`The SDMX registry must be on the source's own host (${o.host})`);
  let text: string;
  try {
    text = (await safeFetchText(url, { allow: u => u.host === o.host, accept: STRUCTURE_ACCEPT, types: /xml|json|text\/plain|octet-stream/i, maxBytes: 10_000_000, fetch: o.fetch, resolve: o.resolve })).text;
  } catch (e) {
    throw new Error(`The SDMX structure could not be read from the registry: ${(e as Error).message}`);
  }
  const structure = readStructure(text, o.lang);
  if ('error' in structure) throw new Error(`The SDMX structure could not be read from the registry: ${structure.error}`);
  if (structure.flow && structure.flow.id !== ref.id) throw new Error(`The registry answered with dataflow ${structure.flow.id}, not ${ref.id}`);
  return { structure, url, sha256: createHash('sha256').update(text, 'utf8').digest('hex') };
}

/**
 * Checks observations against a structure: `check(codes, flowId)` names the
 * first code the office does not define (or a different dataflow), and
 * `labels()` gives the names of the codes seen so far.
 */
export function structureChecker(st: SdmxStructure) {
  const coded = st.components.filter(c => c.codelist && c.role !== 'time' && c.role !== 'measure');
  const seen: Record<string, Record<string, string>> = {};
  return {
    check(codes: Record<string, string>, flowId?: string): string | undefined {
      if (flowId && st.flow && flowId !== st.flow.id) return `The data is for dataflow ${flowId}, but the source's structure is ${st.flow.id}`;
      for (const c of coded) {
        const v = (codes[c.id] ?? '').trim();
        if (!v) continue;
        const list = st.codelists[c.codelist!]!;
        const label = list.codes[v];
        if (label === undefined) return `${c.id} "${v}" is not a code of ${list.id} (${list.agency}, version ${list.version})`;
        const m = (seen[c.id] ??= {});
        if (Object.keys(m).length < LABELS_PER_COMPONENT) m[v] = label;
      }
      return undefined;
    },
    labels: () => seen,
  };
}
