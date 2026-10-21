#!/usr/bin/env python3
"""Requirements traceability register for docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md.

Run from the repository root:
    python3 -I app/scripts/requirements/extract.py .
Writes docs/requirements/requirements.json and docs/INSTITUTIONAL_REQUIREMENTS.md and prints the
counts plus the self-check (every numbered section heading of the spec yields
at least one row; any section with zero rows is reported and makes the exit
code 1).

Pieces: parse_spec.py (mechanical extraction), rules.py (status knowledge base,
evidence verified against app/src on 21 Oct 2026), and the acceptance statuses
read from docs/INSTITUTIONAL_ACCEPTANCE.md for the 91 acceptance items.
"""
import collections, json, os, re, sys
sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parse_spec  # noqa: E402
import rules as KB  # noqa: E402
import reassign  # noqa: E402
import plan_weaker  # noqa: E402
import findings  # noqa: E402

REPO = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT_JSON = os.path.join(REPO, 'docs/requirements/requirements.json')
OUT_MD = os.path.join(REPO, 'docs/INSTITUTIONAL_REQUIREMENTS.md')
SPEC = os.path.join(REPO, 'docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md')
ACC = os.path.join(REPO, 'docs/INSTITUTIONAL_ACCEPTANCE.md')

# ------------------------------------------------------------------ sectors
SECTORS = {
    0: {'intro': 'Cross-cutting'},
    1: {'intro': 'Cross-cutting', '1': 'Institution contract', '1.1': 'Institution contract', '2': 'Standards',
        '3': 'Presidency and Cabinet', '4': 'Finance and Treasury', '5': 'Tax', '6': 'Customs', '7': 'Central bank',
        '8': 'Trade and investment', '9': 'Procurement', '10': 'Internal administration', '11': 'Forms (common contract)',
        '12': 'National twin', '13': 'Acceptance', '14': 'Standards'},
    2: {'intro': 'Cross-cutting', 'A': 'Institution catalogue', 'A.1': 'Civil registration and identity', 'A.2': 'Civil registration and identity',
        'A.3': 'Health', 'A.4': 'Education', 'A.5': 'Immigration', 'A.6': 'Labour', 'A.7': 'Social protection', 'A.8': 'Agriculture',
        'A.9': 'Water', 'A.10': 'Professional licensing', 'B': 'Institution workspace contract', 'C': 'Cross-cutting',
        'C.1': 'Civil registration and identity', 'C.2': 'Health', 'C.3': 'Education', 'C.4': 'Immigration', 'C.5': 'Labour',
        'C.6': 'Social protection', 'C.7': 'Agriculture', 'C.8': 'Water', 'C.9': 'Professional licensing', 'D': 'Exchange',
        'E': 'Fieldwork and legacy', 'F': 'National twin', 'G': 'Readiness and acceptance'},
    3: {'intro': 'Cross-cutting', 'A': 'Justice (general)', 'A.1': 'Judiciary', 'A.2': 'Prosecution', 'A.3': 'Corrections', 'A.4': 'Police',
        'A.5': 'Defence', 'B': 'Emergency management', 'B.6': 'Emergency management', 'C': 'Territory', 'C.7': 'Land and cadastre',
        'C.8': 'Mapping and geospatial', 'C.9': 'Local government', 'D': 'Infrastructure', 'D.10': 'Transport', 'D.11': 'Energy',
        'D.12': 'Environment', 'D.13': 'Housing and building control', 'D.14': 'Public works', 'E': 'Exchange',
        'F': 'National twin', 'G': 'Readiness and acceptance', 'H': 'Implementation order and risks'},
    4: {'intro': 'Independence (general)', 'A': 'Independence (general)', 'A.1': 'Legislature', 'A.2': 'Electoral', 'A.3': 'Supreme audit',
        'A.4': 'Ombudsman', 'A.5': 'Data protection', 'A.6': 'Human rights', 'A.7': 'Anti-corruption', 'A.8': 'Statistics',
        'A.9': 'Regulators', 'A.10': 'Public service commission', 'B': 'Independence contract', 'C': 'Independence (general)',
        'C.1': 'Legislature', 'C.2': 'Electoral', 'C.3': 'Supreme audit', 'C.4': 'Ombudsman', 'C.5': 'Data protection',
        'C.6': 'Human rights', 'C.7': 'Anti-corruption', 'C.8': 'Statistics', 'C.9': 'Regulators', 'C.10': 'Public service commission',
        'D': 'Shared administration', 'E': 'Authorisation and privileged roles', 'F': 'Readiness and acceptance',
        'G': 'Readiness and acceptance', 'H': 'Implementation order and risks'},
    5: {'intro': 'Architecture', 'A': 'Architecture', 'B': 'Kernel', 'C': 'Control plane', 'D': 'Standalone deployment', 'E': 'Federation',
        'F': 'APIs and events', 'G': 'Ownership and portability', 'H': 'Security and keys', 'I': 'Hosting', 'J': 'Migration',
        'K': 'Completeness model', 'L': 'Acceptance', 'M': 'Architecture'},
    6: {'intro': 'Design system', 'A': 'Design system', 'B': 'Design system', 'C': 'Workspace shell and screens', 'D': 'Workspace shell and screens',
        'E': 'Accessibility and localisation', 'F': 'Production, training, demo', 'G': 'Design system', 'H': 'Design system',
        'I': 'Roadmap', 'J': 'Risks', 'K': 'Launch checklist', 'L': 'Roadmap'},
}


def sector_of(part, sec):
    m = SECTORS.get(part, {})
    if sec in m:
        return m[sec]
    top = sec.split('.')[0]
    return m.get(top, 'Cross-cutting')


# default when no rule matched: (status, evidence, missing, step)
SECTOR_DEFAULT = {
    'Presidency and Cabinet': ('Not yet', KB.ABSENT, 'Records and procedures', 'I5'),
    'Finance and Treasury': ('Not yet', KB.SCREENS, 'Treasury records and procedures', 'I5'),
    'Tax': ('Partial', 'lib/tax/', 'Extension', 'Unassigned'),
    'Customs': ('Partial', 'lib/customs/', 'Extension', 'Unassigned'),
    'Central bank': ('Lower priority', 'Plan §4', '', 'I11'),
    'Trade and investment': ('Not yet', KB.SCREENS, '', 'I5'),
    'Procurement': ('Not yet', KB.SCREENS, '', 'I5'),
    'Internal administration': ('Not yet', KB.ABSENT, 'No plan step', 'Unassigned'),
    'Health': ('Partial', 'lib/health/, lib/professions/', '', 'I4'),
    'Labour': ('Not yet', KB.SCREENS, '', 'I6'),
    'Social protection': ('Not yet', KB.SCREENS, '', 'I6'),
    'Agriculture': ('Not yet', KB.SCREENS, '', 'I6'),
    'Water': ('Not yet', KB.SCREENS, '', 'I6'),
    'Prosecution': ('Lower priority', 'Plan §4', '', 'I11'),
    'Corrections': ('Lower priority', 'Plan §4', '', 'I11'),
    'Defence': ('Lower priority', 'Plan §4', '', 'I11'),
    'Electoral': ('Lower priority', 'Plan §4', '', 'I11'),
}

COUNTRY = re.compile(r"(country must|nation must|national configuration must|must come from approved national configuration|country configurable|country-configurable|configured by (law|national|the nation|jurisdiction)|The country must define|must be a versioned national rule|according to the country|is configurable by country|A country may|A nation may|country's law|national law determines|national legislation determines|depend on the country)", re.I)

CATALL = lambda r: r['t'] is None or r['t'].pattern == '.'


def assess(row):
    first = [r for r in KB.RULES if not CATALL(r)]
    rest = [r for r in KB.RULES if CATALL(r)]
    for group in (first,):
        for r in group:
            if r['p'] is not None and r['p'] != row['part']:
                continue
            if r['s'] and not r['s'].search(row['section']):
                continue
            if not r['t'].search(row['text']):
                continue
            return dict(status=r['status'], evidence=r['ev'], missing=r['miss'], step=r['step'], also=r['also'], rule='specific')
    if COUNTRY.search(row['text']):
        d = SECTOR_DEFAULT.get(row['sector'])
        built = not d or d[0] in ('Partial', 'Met')
        return dict(status='Country decision',
                    evidence='Platform provides the decision as configuration: procedures drafted, tested and approved by two officials (lib/casework/packages.ts), rules (lib/law/rules.ts), permit authority mappings (lib/permits/authority.ts), institution terms via lib/law/policy-change.ts, authorities from the deployment profile (authorityFor())',
                    missing='' if built else f'The {row["sector"]} records/procedures do not exist, so there is nothing yet to configure',
                    step='—' if built else (d[3] if d else 'Unassigned'), also='', rule='country')
    for r in rest:
        if r['p'] is not None and r['p'] != row['part']:
            continue
        if r['s'] and not r['s'].search(row['section']):
            continue
        return dict(status=r['status'], evidence=r['ev'], missing=r['miss'], step=r['step'], also=r['also'], rule='section')
    d = SECTOR_DEFAULT.get(row['sector'])
    if d:
        return dict(status=d[0], evidence=d[1], missing=d[2], step=d[3], also='', rule='sector-default')
    return dict(status='Not yet', evidence='No rule matched (review)', missing='', step='Unassigned', also='', rule='none')


# ------------------------------------------------------------------ categories
HDR_CAT = {'capability': 'architecture', 'department': 'department', 'department or body': 'department', 'function': 'department',
           'service': 'service', 'register': 'register', 'record': 'register', 'stage': 'procedure', 'workspace': 'architecture',
           'provenance': 'twin', 'requirement': 'security', 'shared service': 'architecture', 'profile': 'architecture',
           'hosting model': 'architecture', 'dimension': 'architecture', 'risk': 'risk', 'component family': 'design', 'token': 'design',
           'from': 'exchange', 'domain': 'twin'}


def category_of(row):
    k, part, sec, lab, text = row['kind'], row['part'], row['section'], (row.get('label') or ''), row['text']
    labl = lab.lower()
    if k in ('form', 'form-control'):
        return 'form'
    if k == 'checklist':
        return 'acceptance'
    if k == 'numbered' and ((part == 1 and sec == '13') or (part in (2, 3, 4) and sec == 'G') or (part == 5 and sec == 'L')):
        return 'acceptance'
    if k == 'table':
        h = (row.get('table_header') or [''])[0].lower()
        c = HDR_CAT.get(h)
        if c == 'architecture' and part == 2 and sec == 'E':
            return 'fieldwork'
        if c:
            return c
    if k in ('stage', 'chain'):
        return 'procedure'
    if k == 'listed':
        lead = (row.get('lead') or '').lower()
        if 'twin' in lead:
            return 'twin'
        if 'kpi' in lead or 'indicator' in lead:
            return 'KPI'
        if 'record' in lead or 'owns' in lead or 'registers' in lead:
            return 'register'
        if 'role' in lead:
            return 'role'
    if k == 'contract':
        if (part == 1 and sec == '12') or (part == 2 and sec == 'F'):
            return 'twin'
        if part == 4:
            return 'security'
        if part == 5 and sec.startswith('F') or (part == 2 and sec == 'D'):
            return 'exchange'
        if part == 3:
            return 'register'
        return 'architecture'
    if k == 'numbered' and labl.startswith('workflow'):
        return 'procedure'
    if k == 'numbered' and part == 5 and sec == 'F.3':
        return 'exchange'
    # by label
    for rx, c in parse_spec.LABEL_CAT:
        if lab and rx.search(lab):
            if c == 'KPI' and 'twin' in labl:
                return 'twin'
            if k == 'sentence' and c in ('department', 'register', 'KPI', 'role', 'form'):
                break
            return c
    if part == 1 and sec in ('3.6', '5.6', '7.5', '9.5') and k == 'list':
        return 'KPI'
    if part == 1 and sec == '4.6' and k == 'list':
        return 'twin'
    if part == 1 and sec == '3.7' and k == 'list':
        return 'role'
    if part == 1 and sec == '11':
        return 'form'
    if part == 2 and sec == 'E':
        return 'fieldwork'
    if (part == 2 and sec == 'D') or (part == 3 and sec == 'E') or (part == 5 and sec in ('E', 'F', 'F.1', 'F.2', 'F.3')):
        return 'exchange'
    if (part == 1 and sec == '12') or (part == 2 and sec == 'F') or (part == 3 and sec == 'F'):
        return 'twin'
    if part == 4 and sec in ('B', 'E'):
        return 'security'
    if part == 5:
        return 'security' if sec == 'H' else 'architecture'
    if part == 6:
        if sec == 'J':
            return 'risk'
        if sec == 'F':
            return 'security'
        if sec in ('I', 'L'):
            return 'architecture'
        return 'design'
    if part == 3 and sec == 'H' and k == 'list':
        return 'risk'
    if part == 2 and sec == 'G' and k == 'pair':
        return 'architecture'
    if part == 4 and sec == 'F':
        return 'architecture'
    return 'prose-rule'


# ------------------------------------------------------------------ acceptance register
def read_acceptance():
    out = {}
    for line in open(ACC, encoding='utf-8'):
        m = re.match(r'^\| (P\d-\d\d) \|(.*)$', line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(2).strip().rstrip('|').split('|')]
        if m.group(1).startswith('P6'):
            cells = cells[1:]
        text, status, tests, missing, closes = (cells + [''] * 5)[:5]
        st = re.sub(r'\*', '', status)
        out[m.group(1)] = dict(text=text, status={'Proven': 'Met', 'Partial': 'Partial', 'Not yet': 'Not yet'}.get(st, st),
                               tests=tests, missing=missing, closes=closes)
    return out


STEP_RX = re.compile(r'I\d+(?:\.\d)?')


def main():
    rows, heads = parse_spec.parse(SPEC)
    # expand arrow chains inside table cells (service tables) into stage rows
    exp = []
    for r in rows:
        exp.append(r)
        if r['kind'] == 'table' and r['text'].count('→') >= 2:
            cell = [c for c in re.split(r' · |: ', r['text']) if c.count('→') >= 2][0]
            stages = [x.strip() for x in cell.split('→')]
            svc = r['text'].split(':')[0]
            for n, st in enumerate(stages, 1):
                exp.append({**r, 'kind': 'stage', 'text': f"{svc} — stage {n} of {len(stages)}: {st}", 'n': n, 'table_header': ['Stage']})
    rows = exp
    acc = read_acceptance()
    counters = collections.Counter()
    chk_n = 0
    out = []
    for r in rows:
        r['sector'] = sector_of(r['part'], r['section'])
        r['category'] = category_of(r)
        a = None
        if r['category'] == 'acceptance':
            if r['kind'] == 'checklist':
                chk_n += 1
                aid = f'P6-{chk_n:02d}'
            else:
                aid = f"P{r['part']}-{r['n']:02d}"
            a = acc.get(aid)
            if a:
                steps = STEP_RX.findall(a['closes'])
                res = dict(status=a['status'], evidence=f"docs/INSTITUTIONAL_ACCEPTANCE.md {aid}: {a['tests'][:600]}",
                           missing=a['missing'][:600] if a['status'] != 'Met' else '',
                           step=(steps[0] if steps else '—') if a['status'] != 'Met' else '—',
                           also=','.join(steps[1:]), rule='acceptance', acceptance_id=aid)
        if not a:
            res = assess(r)
        # modifiers
        also = [x for x in (res.get('also') or '').split(',') if x]
        miss = res['missing']
        if r['category'] == 'department' and res['status'] == 'Met':
            res = {**res, 'status': 'Partial', 'step': 'I2', 'evidence': 'Functions exist: ' + res['evidence']}
        if r['category'] == 'department' and res['status'] not in ('Platform rule stricter', 'Lower priority'):
            if 'I2' not in also and res['step'] != 'I2':
                also.append('I2')
            if 'Department = {id, name}' not in miss:
                miss = (miss + '; ' if miss else '') + KB.NODEPT
        if r['category'] in ('KPI', 'twin') and res['status'] in ('Partial', 'Not yet') and r['kind'] in ('list', 'listed', 'table'):
            if 'I3' not in also and res['step'] != 'I3':
                also.append('I3')
            if 'ndicator definition' not in miss:
                miss = (miss + '; ' if miss else '') + 'Indicator definition (numerator, denominator, period, coverage, method version; "Not connected" when no data) — plan §3.2'
        if r['category'] == 'form' and res['status'] in ('Partial', 'Not yet') and 'I1' not in also and res['step'] != 'I1':
            also.append('I1')
        sec_key = r['section']
        counters[(r['part'], sec_key)] += 1
        rid = f"S{r['part']}-{sec_key}-{counters[(r['part'], sec_key)]:02d}"
        lines = f"{r['line']}" + (f"-{r['lines_to']}" if r.get('lines_to') and r['lines_to'] != r['line'] else '')
        out.append({
            'id': rid, 'part': r['part'], 'section': sec_key, 'section_title': r['section_title'], 'lines': lines,
            'sector': r['sector'], 'category': r['category'], 'text': r['text'], 'status': res['status'],
            'evidence': res['evidence'], 'missing': miss, 'step': res['step'], 'also_steps': ','.join(also),
            'kind': r['kind'], 'basis': res['rule'], **({'acceptance_id': res['acceptance_id']} if res.get('acceptance_id') else {}),
            **({'form_id': r['form_id']} if r.get('form_id') else {}),
        })

    # revised plan (21 Oct 2026): every row that had no step maps to its revised step
    for o in out:
        new = reassign.revised_step(o)
        if new != o['step']:
            o['first_plan_step'] = o['step']
            o['step'] = new
            # wording written against the first plan text
            o['missing'] = re.sub(r"\s*[—(]?\s*(no plan step( names it)?|(is )?in no (plan )?step'?s? ?(content)?|not in I\d+ content( \([^)]*\))?|— in no plan step)\)?", '', o['missing'], flags=re.I).strip(' ;—')
        also = [x for x in o['also_steps'].split(',') if x and x != 'Unassigned' and x != o['step']]
        o['also_steps'] = ','.join(also)
    # self-check: every numbered section heading contributes at least one row
    zero = []
    for (line, part, sid, title) in heads:
        if sid == 'part':
            continue
        n = sum(1 for o in out if o['part'] == part and (o['section'] == sid or o['section'].startswith(sid + '.')))
        if n == 0:
            zero.append((line, part, sid, title))
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write('\n')
    write_md(out, heads, zero)
    st = collections.Counter(o['status'] for o in out)
    print('rows', len(out))
    print('status', dict(st))
    print('step', dict(collections.Counter(o['step'] for o in out)))
    print('basis', dict(collections.Counter(o['basis'] for o in out)))
    print('headings', sum(1 for h in heads if h[2] != 'part'), 'zero-row sections', zero)
    return 1 if zero else 0


# ------------------------------------------------------------------ markdown
STATUSES = ['Met', 'Partial', 'Not yet', 'Platform rule stricter', 'Country decision', 'Lower priority']
STEPS = ['—', 'I0.2', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10', 'I11', 'Throughout', 'Unassigned']



def esc(s):
    return (s or '').replace('|', '\\|').replace('\n', ' ')


def table_counts(out, key, keys):
    hdr = '| ' + key + ' | ' + ' | '.join(STATUSES) + ' | Total |\n|' + '---|' * (len(STATUSES) + 2) + '\n'
    lines = []
    for k in keys:
        rs = [o for o in out if o[key.lower()] == k] if key != 'Sector' else [o for o in out if o['sector'] == k]
        if not rs:
            continue
        c = collections.Counter(o['status'] for o in rs)
        lab = ('0 (intro)' if (key == 'Part' and k == 0) else k)
        lines.append(f"| {lab} | " + ' | '.join(str(c.get(s, 0)) for s in STATUSES) + f" | {len(rs)} |")
    c = collections.Counter(o['status'] for o in out)
    lines.append('| **All** | ' + ' | '.join(f"**{c.get(s, 0)}**" for s in STATUSES) + f" | **{len(out)}** |")
    return hdr + '\n'.join(lines) + '\n'


def write_md(out, heads, zero):
    md = []
    md.append('# Institutional requirements traceability register\n')
    md.append('Read-only trace of every requirement in `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md` (six parts) against the code in `app/src` '
              'on 21 October 2026 (main checkout, after step I0.1), with the plan step that delivers each one '
              '(`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md` §5). Machine-readable rows: `docs/requirements/requirements.json`. '
              'Re-run from the repository root: `python3 -I app/scripts/requirements/extract.py .` (scripts in `app/scripts/requirements/`; '
              'status knowledge base `rules.py`, step reassignment under the revised plan `reassign.py`). '
              'Checked by `app/src/lib/requirements/requirements.test.ts`.\n')
    md.append('**Binding (plan §5, Traceability).** This register is binding: a step\'s brief lists the requirement IDs it delivers; '
              'a step is finished only when each is met or its deviation is written down; a change that meets or breaks a requirement updates its row '
              '(edit `rules.py` and re-run).\n')
    md.append('**How rows were made.** `parse_spec.py` extracts one row per table data row, list item, numbered workflow stage, arrow-chain stage '
              '(chains in table cells too), form (by `form_id`) and each of its `decision`/`rules`/`controls` keys, each key of a non-form JSON contract, '
              'each item of an inline list (`Indicators: …`, `KPIs: …`, `Records: …`, roles/registers lists), each title/description pair in the '
              'unheaded layouts (readiness dimensions, security layers, roadmap …), each launch-checklist item, and each prose sentence that states a '
              'requirement (must / should / never / only / do not … or an imperative). Form *fields* are not split (the forms agent covers them). '
              'Lines 1–29 (provenance note) are not specification text.\n')
    md.append('**Status rules (strict).** *Met*: the behaviour exists end to end (procedure, register, permission) and, where possible, a test proves it. '
              '*Partial*: some of it exists; the gap is named. *Not yet*: nothing beyond a screen or a word. *Platform rule stricter*: a binding CLAUDE.md '
              'rule decides more strictly (cited). *Country decision*: the spec leaves it to the nation; the row says what the platform provides for it. '
              '*Lower priority*: plan §4 (still tracked, step given). The 91 acceptance rows take their status from `docs/INSTITUTIONAL_ACCEPTANCE.md` (Proven → Met). '
              'Steps: `—` nothing further for the row; I0.2–I11 and Throughout as in plan §5; `Unassigned` = no step delivers it. '
              'Rows the first plan text left without a step carry `first_plan_step: Unassigned` in the JSON. Department rows add I2, KPI rows add I3, form rows add I1 in `also_steps`.\n')
    md.append(f"**Self-check.** {sum(1 for h in heads if h[2] != 'part')} numbered section headings found; sections with zero rows: "
              + ('none.' if not zero else ', '.join(f"Part {p} {s} (line {l})" for l, p, s, t in zero)) + '\n')
    md.append(f"## Totals\n\n{len(out)} rows.\n")
    md.append(table_counts(out, 'Part', [0, 1, 2, 3, 4, 5, 6]))
    md.append('\n### By plan step\n\n' + table_counts(out, 'Step', STEPS))
    sectors = []
    for o in out:
        if o['sector'] not in sectors:
            sectors.append(o['sector'])
    md.append('\n### By sector\n\n' + table_counts(out, 'Sector', sectors))
    md.append('\n### By category\n\n' + table_counts(out, 'Category', sorted({o['category'] for o in out})))
    # reassignment and remaining gaps
    moved = [o for o in out if o.get('first_plan_step')]
    left = [o for o in out if o['step'] == 'Unassigned']
    md.append(f"\n## Plan gaps closed by the revised plan\n\n{sum(1 for o in moved if o['first_plan_step'] == 'Unassigned')} rows had no step under the first plan text; "
              f"each now maps to a step of the revised plan (table below). Rows still without a step: {len(left)}.\n")
    md.append('| Part | Sector | Rows | Revised step |\n|---|---|---|---|')
    agg = collections.OrderedDict()
    for o in moved:
        agg.setdefault((o['part'], o['sector'], o['step']), []).append(o['id'])
    for (p, sec, st), ids in agg.items():
        md.append(f"| {p} | {sec} | {len(ids)} | {st} |")
    if left:
        md.append('\n### Still unassigned\n')
        for o in left:
            md.append(f"- `{o['id']}` {esc(o['text'][:160])}")
    md.append('\n' + plan_weaker.markdown())
    md.append('\n' + findings.TEXT)
    # register
    md.append('\n## Register by part and sector\n')
    for p in range(0, 7):
        prs = [o for o in out if o['part'] == p]
        if not prs:
            continue
        md.append(f"\n## Part {p}\n")
        secs = []
        for o in prs:
            if o['sector'] not in secs:
                secs.append(o['sector'])
        for s in secs:
            rs = [o for o in prs if o['sector'] == s]
            c = collections.Counter(o['status'] for o in rs)
            md.append(f"\n### {s} — " + ', '.join(f"{k} {c[k]}" for k in STATUSES if c.get(k)) + '\n')
            md.append('| ID | Lines | Cat. | Requirement | Status | Evidence | Missing | Step |\n|---|---|---|---|---|---|---|---|')
            for o in rs:
                step = o['step'] + (f" (+{o['also_steps']})" if o['also_steps'] else '')
                md.append(f"| {o['id']} | {o['lines']} | {o['category']} | {esc(o['text'][:220])} | {o['status']} | {esc(o['evidence'][:150])} | {esc(o['missing'][:150])} | {step} |")
    open(OUT_MD, 'w', encoding='utf-8').write('\n'.join(md) + '\n')


if __name__ == '__main__':
    sys.exit(main())
