#!/usr/bin/env python3
"""Mechanical extraction of individual requirements from
docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md (read-only).

One row per: table data row, list item, workflow stage (numbered or arrow
chain), form (by form_id, plus each decision/rules/controls key), JSON
contract key (non-form blocks), comma-listed KPI/indicator/record/role,
paired title/description block, checklist item, and every prose sentence
that states a requirement (must / must not / should / never / only / do not
... or an imperative). Provenance note (lines 1-29) is the owner's, not the
specification, and is skipped.

Usage: python3 parse_spec.py SPEC_PATH  -> prints JSON rows on stdout
Imported by extract.py.
"""
import json, re, sys

PARTS = [(30, 79, 0), (80, 1099, 1), (1100, 2060, 2), (2061, 2763, 3), (2764, 3420, 4), (3421, 4078, 5), (4079, 10**6, 6)]

NOISE = {
    'OECD', 'ITU', 'International Monetary Fund', 'World Customs Organization', 'Open Contracting Partnership',
    'GovStack Specification', 'pefa.org', 'UN Legal Identity Agenda', 'WHO', 'Educational Management Information Systems',
    'ICAO', 'International Labour Organization', 'FAO', 'UNODC', 'gocase.unodc.org', 'UNDRR', 'GGIM', 'UNECE', 'CSRC',
    'NIST', 'go next', 'Copy checklistReset', '0 / 20 checked', '—', 'Readiness checklist',
    'Delivery plan: six parts',
}

# Line ranges with a fixed layout (title/description pairs, triples, roadmap) — read by hand, see README in REQUIREMENTS.md.
LAYOUT = [
    (42, 76, 'triple-num'),        # intro: six parts list (number, title, scope)
    (1853, 1875, 'triple'),        # Part 2 D exchange example steps
    (2001, 2027, 'pair'),          # Part 2 G readiness dimensions
    (3342, 3376, 'pair'),          # Part 4 F readiness checklist
    (3433, 3455, 'pair'),          # Part 5 A architecture layers
    (3533, 3563, 'pair'),          # Part 5 D Institutional Edition contents
    (3603, 3625, 'triple'),        # Part 5 E federation lifecycle stages
    (3825, 3855, 'pair'),          # Part 5 H security layers
    (3999, 4033, 'triple'),        # Part 5 K completeness dashboard example
    (4093, 4103, 'pair'),          # Part 6 A design directions
    (4115, 4149, 'triple'),        # Part 6 B palette (name, hex, use)
    (4173, 4209, 'mock'),          # Part 6 C shell mock-up
    (4243, 4265, 'triple'),        # Part 6 D overview tiles
    (4269, 4279, 'pair'),          # Part 6 D work requiring attention
    (4289, 4295, 'mock'),          # Part 6 D case header mock-up
    (4297, 4315, 'pair'),          # Part 6 D case layout
    (4423, 4437, 'pair'),          # Part 6 E device classes
    (4474, 4490, 'triple'),        # Part 6 F modes
    (4577, 4623, 'roadmap'),       # Part 6 I roadmap
    (4741, 4775, 'triple'),        # Part 6 L six capabilities
]

CATALOGUE = [(1118, 1178), (2778, 2838), (713, 716), (3461, 3490)]  # Part 2 A, Part 4 A: every sentence is a row

MODAL = re.compile(r"\b(must|should|shall|never|cannot|can not|do not|does not|is not|are not|not be|no longer|avoid|only|mandatory|required|requires|require|need|needs|prevent|without|rather than|instead of|not a|not an|not merely|separately|distinct|distinguish|separate|preserve|retain|record|keep|no universal|universal|configurable|country-dependent|universal:)\b", re.I)
IMPERATIVE = re.compile(r"^(Use|Record|Keep|Separate|Apply|Provide|Distinguish|Identify|Offer|Explain|Show|Display|Publish|Compute|Only|Never|Do not|Don't|Build|Start|Establish|Define|Package|Choose|Give|Implement|Test|Add|Connect|Complete|Enforce|Select|Run|Determine|Inventory|Allow|Store|Capture|Queue|Route|Register|Scope|Support|Preserve|Collect|Label|Reject|Ensure|Block|Prevent|Require|Hide|Mark|Verify|Validate|Treat|Interpret|Search|Filter|Save|Sort|Inspect|Request|Log|Avoid|Make|Retain|Deny|Read|Assign|Check|Receive|Issue|Notify|Track|Detect|Authenticate|Reconcile|Approve|Obtain|Send|Accept|Close|Allocate|Manage|Integrate|Validate)\b")
RULE_LEAD = re.compile(r"^(CivicOS application|Important distinction|Important|Non-negotiable safeguard|Architecture boundary|Ownership rule|Boundary|Controls|Safeguards|Separation rule|Critical boundary|National-twin boundary|Required design decision|National twin use|Access model|Hard rule|Critical rule|Design recommendation|Recommendation|Critical implementation rule|Universal|Country-dependent|Deadlines|Public verification|Institutional standing|Part \d conclusion|Exit gate)\s*:")
LIST_LEAD = re.compile(r"^(KPIs|Indicators|Indicators include|Operational KPIs include|National-twin indicators|Records|Core records|Records and controls|Owns)\s*:?\s+", re.I)
LIST_LABELS = {'registers', 'roles', 'national-twin indicators'}

LABEL_CAT = [
    (re.compile(r'^(departments|modules|departments and modules|possible modules)', re.I), 'department'),
    (re.compile(r'(records|registers|register ownership|record ownership|complaint record|benefit case record|police records)$', re.I), 'register'),
    (re.compile(r'^workflow', re.I), 'procedure'),
    (re.compile(r'^(roles|role boundaries|access|roles and access|access boundaries|access controls|privileged administrators)', re.I), 'role'),
    (re.compile(r'(indicators|kpis)', re.I), 'KPI'),
    (re.compile(r'(controls|safeguards|rules|security and rights controls|critical safeguards)$', re.I), 'prose-rule'),
    (re.compile(r'acceptance', re.I), 'acceptance'),
    (re.compile(r'(field/mobile requirements|legacy integration)', re.I), 'fieldwork'),
    (re.compile(r'(exchange|verification response)', re.I), 'exchange'),
    (re.compile(r'(schema|form|fields)$', re.I), 'form'),
]


def part_of(n):
    for a, b, p in PARTS:
        if a <= n <= b:
            return p
    return None


def is_noise(s, nxt):
    s = s.strip()
    return (not s) or s in NOISE or re.fullmatch(r'\+\d+', s) is not None or (nxt is not None and re.fullmatch(r'\+\d+', nxt.strip() or 'x') is not None)


def sentences(text):
    text = re.sub(r'\s+', ' ', text.strip())
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z“"(])', text)
    return [p.strip() for p in parts if p.strip()]


def split_list(body):
    body = body.strip().rstrip('.')
    items = [x.strip() for x in re.split(r',\s+(?![^()]*\))', body) if x.strip()]
    if items and ' and ' in items[-1] and len(items) >= 2:
        last = items.pop()
        a, b = last.rsplit(' and ', 1)
        items += [a.strip(), b.strip()]
    out = []
    for it in items:
        it = re.sub(r'^and\s+', '', it)
        if it:
            out.append(it[0].upper() + it[1:])
    return out


def parse(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    N = len(lines)
    L = lambda i: lines[i - 1] if 1 <= i <= N else ''
    rows = []
    heads = []  # (line, part, section_id, title)
    state = {'part': 0, 'letter': None, 'num': None, 'sub': None, 'title': 'Introduction', 'label': None}

    def sec_id():
        p = state['part']
        if p == 1:
            if state['sub']:
                return state['sub']
            return state['num'] or 'intro'
        if p == 0:
            return 'intro'
        if state['letter'] and state['num']:
            return f"{state['letter']}.{state['num']}"
        return state['letter'] or 'intro'

    def emit(line, text, kind, extra=None):
        r = {'line': line, 'part': state['part'], 'section': sec_id(), 'section_title': state['title'],
             'label': state['label'], 'kind': kind, 'text': text}
        if extra:
            r.update(extra)
        rows.append(r)

    layout_at = {}
    for a, b, mode in LAYOUT:
        layout_at[a] = (b, mode)
    in_catalogue = lambda n: any(a <= n <= b for a, b in CATALOGUE)

    i = 30
    table_hdr = None
    while i <= N:
        raw = L(i)
        s = raw.strip()
        p = part_of(i)
        if p is not None and p != state['part']:
            state.update(part=p, letter=None, num=None, sub=None, label=None, title=f'Part {p}')
        # Part title lines
        if s.startswith('## '):
            state['title'] = s[3:]
            heads.append((i, state['part'], 'part', s[3:]))
            i += 1
            continue
        # fixed-layout ranges
        if i in layout_at:
            b, mode = layout_at[i]
            block = [(k, L(k).strip()) for k in range(i, b + 1)]
            block = [(k, t) for idx, (k, t) in enumerate(block) if t and not is_noise(t, None) and not re.fullmatch(r'\+\d+', t)]
            if mode == 'pair':
                j = 0
                while j < len(block):
                    k, t = block[j]
                    if j + 1 < len(block) and not t.endswith('.') and len(t) < 70:
                        emit(k, f"{t}: {block[j+1][1]}", 'pair', {'lines_to': block[j+1][0]})
                        j += 2
                    else:
                        emit(k, t, 'pair'); j += 1
            elif mode in ('triple', 'triple-num'):
                for j in range(0, len(block) - 2, 3):
                    (k1, a1), (k2, a2), (k3, a3) = block[j:j+3]
                    emit(k1, f"{a1} — {a2}: {a3}", 'pair', {'lines_to': k3})
            elif mode == 'mock':
                emit(i, 'Illustrative layout: ' + ' · '.join(t for _, t in block), 'mock', {'lines_to': b})
            elif mode == 'roadmap':
                groups, cur = [], []
                for k, t in block:
                    if re.fullmatch(r'0\d', t):
                        if cur: groups.append(cur)
                        cur = [(k, t)]
                    else:
                        cur.append((k, t))
                if cur: groups.append(cur)
                for g in groups:
                    num = g[0][1]
                    body = [t for _, t in g[1:]]
                    gate = [t for t in body if t.startswith('Exit gate')]
                    main = [t for t in body if not t.startswith('Exit gate')]
                    emit(g[0][0], f"Roadmap {num} — {main[0]}: {' '.join(main[1:])}", 'pair', {'lines_to': g[-1][0]})
                    for t in gate:
                        emit(g[-1][0], f"Roadmap {num} — {t}", 'pair')
            i = b + 1
            continue
        if not s:
            i += 1
            continue
        # headings
        m = re.match(r'^#### (\d+)\.(\d+) (.+)$', s)
        if m:
            state['sub'] = f"{m.group(1)}.{m.group(2)}"; state['title'] = m.group(3); state['label'] = None
            heads.append((i, state['part'], state['sub'], m.group(3)))
            i += 1; continue
        m = re.match(r'^([A-M])\. (.+)$', s)
        if m and state['part'] >= 2 and len(s) < 100:
            state.update(letter=m.group(1), num=None, title=m.group(2), label=None)
            heads.append((i, state['part'], m.group(1), m.group(2)))
            i += 1; continue
        m = re.match(r'^(\d+)\. ([^.]+)$', s)
        if m and len(s) < 100 and state['part'] >= 1:
            state['num'] = m.group(1); state['sub'] = None; state['title'] = m.group(2); state['label'] = None
            heads.append((i, state['part'], sec_id(), m.group(2)))
            i += 1; continue
        # JSON blocks
        if s.startswith('```json'):
            j = i + 1
            buf = []
            while j <= N and not L(j).strip().startswith('```'):
                buf.append(L(j)); j += 1
            src = '\n'.join(buf)
            try:
                obj = json.loads(src)
            except Exception:
                obj = None
            if isinstance(obj, dict) and 'form_id' in obj:
                fid = obj['form_id']
                nf = len(obj.get('fields', []))
                emit(i, f"Form {fid}" + (f" (record type {obj['record_type']})" if obj.get('record_type') else '') +
                     (f", version {obj['version']}" if obj.get('version') else '') + f": {nf} typed fields ({', '.join(f['id'] for f in obj.get('fields', []))})",
                     'form', {'lines_to': j, 'form_id': fid})
                for key in ('rules', 'decision', 'controls'):
                    for k, v in (obj.get(key) or {}).items():
                        emit(i, f"Form {fid} {key}: {k} = {json.dumps(v)}", 'form-control', {'lines_to': j, 'form_id': fid})
            elif isinstance(obj, dict):
                def walk(o, prefix, depth):
                    for k, v in o.items():
                        path = f"{prefix}{k}"
                        if isinstance(v, dict) and depth < 1:
                            walk(v, path + '.', depth + 1)
                        else:
                            emit(i, f"Contract field {path} (example: {json.dumps(v)[:80]})", 'contract', {'lines_to': j})
                walk(obj, '', 0)
            else:
                emit(i, 'JSON block (unparsed)', 'contract', {'lines_to': j})
            i = j + 1
            continue
        # tables
        if s.startswith('|'):
            cells = [c.strip() for c in s.strip('|').split('|')]
            if re.fullmatch(r'[|\s:\-]+', s):
                i += 1; continue
            if L(i + 1).strip().startswith('|---'):
                table_hdr = cells; i += 1; continue
            hdr = table_hdr or []
            text = cells[0] + ': ' + ' · '.join(
                (f"{hdr[n]}: {c}" if n < len(hdr) and len(cells) > 2 else c) for n, c in enumerate(cells[1:], 1))
            emit(i, text, 'table', {'table_header': hdr})
            i += 1; continue
        table_hdr = None
        nxt = L(i + 1)
        if is_noise(s, nxt if nxt.strip() else L(i + 2) if False else nxt):
            i += 1; continue
        # checklist
        if s.startswith('[ ]'):
            emit(i, s[3:].strip(), 'checklist'); i += 1; continue
        # list items
        if s.startswith('- '):
            emit(i, s[2:].strip(), 'list'); i += 1; continue
        m = re.match(r'^(\d+)\. (.+)$', s)
        if m:
            emit(i, m.group(2), 'numbered', {'n': int(m.group(1))}); i += 1; continue
        # endpoint paths
        if s.startswith('/') and '{' in s:
            emit(i, f"Endpoint family {s}", 'list'); i += 1; continue
        # arrow chains
        if s.count('→') >= 2:
            emit(i, s, 'chain')
            stages = [x.strip().rstrip('.') for x in s.split('→')]
            for n, st in enumerate(stages, 1):
                emit(i, f"Stage {n} of {len(stages)}: {st}", 'stage', {'n': n})
            i += 1; continue
        # labels
        prev_blank = not L(i - 1).strip()
        next_blank = not L(i + 1).strip()
        if prev_blank and next_blank and len(s) <= 70 and not s.endswith('.') and not s.endswith(':') and not in_catalogue(i) and not LIST_LEAD.match(s):
            state['label'] = s
            i += 1; continue
        # prose
        sents = sentences(s)
        lead_list = LIST_LEAD.match(s)
        lab = (state['label'] or '').lower()
        if lead_list or (lab in LIST_LABELS and sents and sents[0].count(',') >= 3 and len(sents[0]) < 400):
            first = sents[0]
            body = first[lead_list.end():] if lead_list else first
            body = re.sub(r'^(the institution may own|include)\s*:?\s*', '', body, flags=re.I)
            for it in split_list(body):
                emit(i, it, 'listed', {'lead': (lead_list.group(1) if lead_list else state['label'])})
            rest = sents[1:]
        else:
            rest = sents
        for st in rest:
            if in_catalogue(i) or RULE_LEAD.match(s) or MODAL.search(st) or IMPERATIVE.match(st):
                emit(i, st, 'sentence')
        i += 1
    return rows, heads


if __name__ == '__main__':
    rows, heads = parse(sys.argv[1])
    json.dump({'rows': rows, 'heads': heads}, sys.stdout, indent=1, ensure_ascii=False)
