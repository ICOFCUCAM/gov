"""Rows of the forms catalogue (docs/forms-catalogue/*.md, one 13-part series) for the requirements register.

build(repo) -> (rows, checks, markdown). Each row: id (the catalogue ID itself where the line carries one,
otherwise FC<part>-<section>-<nn>), source file and line numbers, part and section path, sector, category,
the text verbatim, status, evidence, missing, step and also_steps (catalogue_rules.py).
"""
import collections, json, os, re
import parse_catalogue as P
import catalogue_rules as CR

FILES = [
    ('docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md', 'FLD-01-02'),
    ('docs/forms-catalogue/FIELD-SERIES-PARTS-03-04.md', 'FLD-03-04'),
    ('docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md', 'FLD-05-07'),
    ('docs/forms-catalogue/PARTS-08-11.md', 'CAT-08-11'),
    ('docs/forms-catalogue/PARTS-12-13.md', 'CAT-12-13'),
    ('docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md', 'SUP'),
]
README = 'docs/forms-catalogue/README.md'
SERIES = 'CivicOS — Complete Government Form System (ChatGPT), parts 1–13, and its supplement, parts 14–22'

# Topics the 13 parts left out (README "Gaps"), each now catalogued by a part of the supplement: shown in the register as
# the mapping, the rows themselves are the supplement's.
GAP_PARTS = [
    ('Labour and employment', 14), ('Social protection and benefits', 15), ('Foreign affairs, consular and diaspora', 16),
    ('Tourism, culture, youth and sports', 17), ('Professional licensing beyond health', 18), ('Local and regional government', 19),
    ('Housing, planning and building control', 20), ('Shared internal administration of every institution', 21),
    ('Form design and governance standard (part 1 planned it as part 13)', 22),
    ('JSON field contracts for parts 5–13', 'Stage B (core forms only; every other form is "contract not yet given")'),
]

KIND_CAT = {'contract': 'data contract', 'contract-field': 'data contract', 'contract-key': 'data contract', 'field-spec': 'data contract',
            'gate': 'acceptance gate', 'stage': 'workflow stage', 'state': 'state', 'permission': 'permission', 'plan-block': 'engineering deliverable'}


def category(r):
    cid = r.get('catalogue_id') or ''
    if cid:
        if re.match(r'^(CFG-|country\.)', cid):
            return 'configuration'
        if cid.startswith('REG-'):
            return 'register'
        if re.match(r'^(EX-|HX-|JX-|INT-)', cid):
            return 'exchange'
        if re.match(r'^(civicos\.|iso\.)', cid):
            return 'values source'
        if re.match(r'^core\.', cid):
            return 'field group'
        if re.match(r'^tax\.return_schema\.', cid):
            return 'data contract'
        return 'form'
    if r['kind'] in KIND_CAT:
        return KIND_CAT[r['kind']]
    if r['kind'] == 'table':
        return 'data contract' if re.search(r'contract|schema|record|field|object|requirement', (r.get('top_title') or '') + ' ' + (r.get('section_title') or '') + ' ' + (r.get('lead') or ''), re.I) else 'table row'
    if re.search(r'activation gates', r.get('top_title') or '', re.I) and r['kind'] in ('numbered', 'list'):
        return 'acceptance gate'
    if re.search(r'engineering|deliverable|implementation plan', r.get('top_title') or '', re.I) and r['kind'] in ('numbered', 'list'):
        return 'engineering deliverable'
    if re.search(r'definition of done|is complete when|final architectural rule', (r.get('top_title') or '') + ' ' + r['text'], re.I):
        return 'definition of done'
    if re.search(r'\b(must|should|never|do not|must not|cannot|only|require|shall)\b', r['text'], re.I):
        return 'safeguard'
    return 'scope'


SCOPE = 'docs/requirements/form-scope.json'
# CivicOS's own field contracts for catalogue forms whose text gives none, written in controlled batches (owner's direction 2026-10-21):
# canonical civicos.form-contract.v1 JSON, each naming the one register row it answers (`catalogue`: source file and catalogue ID).
LIBRARY = 'app/src/lib/forms/library/catalogue-contracts'
GROUPS = 'app/src/lib/forms/library/canonical/groups'
LIBRARY_GIVEN = 'given (CivicOS library)'
CONTRACT_GIVEN = ('given', LIBRARY_GIVEN)


def row_lines(o):
    """The line numbers a register row covers (its `lines`: a number, a range a-b, or several separated by commas)."""
    out = set()
    for part in str(o.get('lines') or '').split(','):
        a, _, b = part.strip().partition('-')
        if a.isdigit():
            out.update(range(int(a), int(b if b.isdigit() else a) + 1))
    return out


def library_contracts(repo):
    """The form library's catalogue contracts: path, the register row they name (source, id), batch and every field key (a field group's fields
    as the form uses them, a repeatable group's questions as key.question)."""
    d = os.path.join(repo, LIBRARY)
    groups = {}
    for f in os.listdir(os.path.join(repo, GROUPS)):
        g = json.load(open(os.path.join(repo, GROUPS, f), encoding='utf-8'))
        groups[(g['group_id'], g['version'])] = [x['id'] for x in g.get('fields', [])]
    out = []
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not f.endswith('.json'):
            continue
        c = json.load(open(os.path.join(d, f), encoding='utf-8'))
        keys = []
        for x in c.get('fields', []):
            if 'use_group' in x:
                keys += x.get('only') or groups.get((x['use_group'], x.get('version', 1)), [])
            else:
                keys.append(x['id'])
                keys += [f"{x['id']}.{i['id']}" for i in x.get('items') or []]
        cat = c.get('catalogue') or {}
        out.append(dict(path=f'{LIBRARY}/{f}', source=cat.get('source'), id=cat.get('id'), line=cat.get('line'), form_id=c.get('form_id'), fields=keys,
                        batch=cat.get('batch', 1), title=(c.get('library') or {}).get('title', '')))
    return out
FORM_STATUSES = ['catalogued', 'contract_missing', 'contract_draft', 'under_review', 'blocked', 'excluded', 'approved', 'production']
# field keys a contract may not carry outside an excluded or legal-review form (CLAUDE.md health, education, police rules)
PROHIBITED_FIELD = re.compile(r'patient|clinical|diagnos|prescri|dispens|suspect|biometric|intelligence_product', re.I)
PROHIBITED_EDU_FIELD = re.compile(r'student_id|learner_id|result_value|attendance', re.I)


def load_scope(repo):
    import json
    return json.load(open(os.path.join(repo, SCOPE), encoding='utf-8'))


def apply_scope(rows, checks, repo):
    """One form status per form row (owner's direction 2026-10-21 §2), derived from the files and the checked-in scope list:
    excluded > under_review > blocked > contract_draft > contract_missing. Nothing in the catalogue is approved or production."""
    scope = load_scope(repo)
    entries = {(e['source'], e['id']): e for e in scope['forms']}
    checks['scope_unknown'] = [k for k in entries if not any(o.get('catalogue_id') == k[1] and o['source'] == k[0] and o['category'] == 'form' for o in rows)]
    fields_of = collections.defaultdict(list)
    for o in rows:
        if o['kind'] == 'contract-field' and o.get('contract_id'):
            fields_of[(o['source'], o['contract_id'])].append(o)
    # the library's own contracts are held to the same scope, field by field
    for c in checks.get('library', []):
        fields_of[(c['source'], c['id'])] += [{'field_id': k} for k in c['fields']]
    checks['scope_mismatch'] = []
    for o in rows:
        if o['category'] != 'form':
            continue
        e = entries.get((o['source'], o['catalogue_id']))
        if e and e['scope'] == 'excluded':
            fs, flag = 'excluded', 'excluded_pending_scope_review'
            if o['status'] != 'Platform rule stricter':
                checks['scope_mismatch'].append((o['id'], o['status'], 'excluded'))
                o['status'], o['step'], o['evidence'] = 'Platform rule stricter', '—', e['rule']
        elif e and e['scope'] == 'requires_legal_review':
            fs, flag = 'under_review', 'requires_legal_review'
            if o['status'] != 'Legal review':
                checks['scope_mismatch'].append((o['id'], o['status'], 'requires_legal_review'))
                o['status'], o['evidence'] = 'Legal review', e['rule']
                if o['step'] in ('—', ''):
                    o['step'] = 'I11'
            o['legal_review'] = True
        else:
            flag = None
            bad = [f['field_id'] for f in fields_of.get((o['source'], o['catalogue_id']), []) if PROHIBITED_FIELD.search(f.get('field_id') or '')
                   or (o['catalogue_id'].startswith('EDU-') and PROHIBITED_EDU_FIELD.search(f.get('field_id') or ''))]
            if bad:
                fs = 'blocked'
                flag = 'excluded_pending_scope_review'
                o['blocked_by'] = 'Its contract carries fields outside the approved scope (' + ', '.join(bad) + '): the contract is excluded pending scope review and cannot pass validation'
            elif o['contract'] in CONTRACT_GIVEN:
                fs = 'contract_draft'
            else:
                fs = 'contract_missing'
            if o['status'] in ('Platform rule stricter', 'Legal review'):
                checks['scope_mismatch'].append((o['id'], o['status'], 'not in the scope list'))
        o['form_status'] = fs
        if flag:
            o['scope_flag'] = flag
        if e and e['scope'] == 'allowed':
            o['scope'] = 'allowed'
            o['scope_rule'] = e['rule']
        elif e:
            o['scope'] = e['scope']
            o['scope_rule'] = e['rule']


def build(repo):
    rows, checks = [], {'unaccounted': [], 'zero': [], 'ids_missing': [], 'parts': collections.OrderedDict()}
    seen = collections.Counter()
    counters = collections.Counter()
    for rel, tag in FILES:
        path = os.path.join(repo, rel)
        rs, heads, acc, lines, start = P.parse(path, tag)
        checks['unaccounted'] += [(rel, n, l) for n, l in P.unaccounted(lines, start, acc)]
        for r in rs:
            r['tag'] = tag
            res = CR.assess(r)
            cid = r.get('catalogue_id')
            if cid:
                seen[cid] += 1
                rid = cid if seen[cid] == 1 else f'{cid}@P{r["part"]}' + ('' if seen[cid] == 2 else f'-{seen[cid]}')
            else:
                key = (r['part'], r['section'])
                key = (tag == 'SUP',) + key
                counters[key] += 1
                pre = 'FCS' if tag == 'SUP' else 'FC'
                rid = f'{pre}{r["part"]}-{r["section"]}-{counters[key]:02d}'
            lines_s = f"{r['line']}" + (f"-{r['lines_to']}" if r.get('lines_to') and r['lines_to'] != r['line'] else '')
            o = {'id': rid, 'source': rel, 'part': r['part'], 'section': r['section'], 'section_path': r['path'], 'lines': lines_s, 'sector': res['sector'], 'category': category(r), 'kind': r['kind'], 'text': r['text'],
                 'status': res['status'], 'evidence': res['evidence'], 'missing': res['missing'], 'step': res['step'], 'also_steps': res['also'],
                 'basis': res['basis']}
            if r.get('lead'):
                o['lead'] = r['lead']
            if cid:
                o['catalogue_id'] = cid
            if r.get('cells'):
                o['cells'] = r['cells']
            if res.get('legal_review'):
                o['legal_review'] = True
            if o['evidence'].startswith('Restricted personal data'):
                o['restricted_personal_data'] = True
            o['_tag'] = tag
            if r['kind'] in ('contract', 'contract-field') and r.get('contract_id'):
                o['contract_id'] = r['contract_id']
            if r.get('field_id'):
                o['field_id'] = r['field_id']
            rows.append(o)
        # self-check: every heading has a row; every part has rows
        for (ln, part, sid, title, kind) in heads:
            if kind == 'part':
                checks['parts'][part] = (rel, ln, title)
                n = sum(1 for o in rows if o['source'] == rel and o['part'] == part)
            else:
                n = sum(1 for o in rows if o['source'] == rel and o['part'] == part and (o['section'] == sid or o['section'].startswith(sid + '.')))
            if n == 0:
                checks['zero'].append((rel, ln, part, sid, title))
        # every catalogue ID of the file has a row
        ids = set()
        for n, l in enumerate(lines, 1):
            m = re.match(r'^((?:[A-Z]{2,5}-)+\d{3}|[a-z][a-z0-9_]*(?:\.[a-z0-9_-]+)+)\t', l) or re.match(r'^- ([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+) — ', l) \
                or re.match(r'^- (country\.[a-z0-9_.]+)$', l) or re.match(r'^ID: (\S+) · ', l)
            if m and n > start:
                ids.add(m.group(1))
        have = {o['catalogue_id'] for o in rows if o['source'] == rel and o.get('catalogue_id')}
        checks['ids_missing'] += [(rel, x) for x in sorted(ids - have)]
    # forms with their own JSON contract: in the same file, or anywhere when the ID means the same form there;
    # every other form: "contract not yet given"
    given = {(o['source'], o['contract_id']) for o in rows if o['kind'] == 'contract' and o.get('contract_id')}
    given_ids = {c for _, c in given}
    titles = collections.defaultdict(set)
    for o in rows:
        if o['category'] == 'form':
            cells = o.get('cells') or {}
            titles[o['catalogue_id']].add((o['source'].split('/')[-1], o['part'], next((v for k, v in cells.items() if re.search(r'form|name|title|purpose', k, re.I) and v != o['catalogue_id']), '')))
    # a catalogue ID used for different forms in different places (the same ID twice in one part of one file is the same form)
    checks['collisions'] = {k: sorted((f, t) for f, _, t in v) for k, v in titles.items() if len({(f, p) for f, p, _ in v}) > 1 and len({t for _, _, t in v}) > 1}
    for o in rows:
        if o['category'] == 'form':
            cid = o['catalogue_id']
            o['contract'] = 'given' if ((o['source'], cid) in given or (cid in given_ids and cid not in checks['collisions'])) else 'not yet given'
    # a form whose text gives no contract and whose contract CivicOS wrote (the form library): matched by source and ID to exactly one row;
    # where the catalogue repeats an ID in one document (taxpayer.registration.further_information, Part 2 §2.6), by the line the contract names
    checks['library'] = library_contracts(repo)
    for c in checks['library']:
        match = [o for o in rows if o['category'] == 'form' and o['source'] == c['source'] and o['catalogue_id'] == c['id']]
        if len(match) > 1:
            match = [o for o in match if c.get('line') in row_lines(o)]
        c['matches'] = [o['id'] for o in match]
        if len(match) == 1 and match[0]['contract'] != 'given':
            match[0]['contract'] = LIBRARY_GIVEN
            match[0]['contract_file'] = c['path']
    apply_scope(rows, checks, repo)
    # a contract and its fields follow the form they define (same file): its sector, step and, where CivicOS will not hold the form or
    # holds it only after legal review, its status; otherwise a field is Partial when the form is built (the field itself is not verified)
    # and Not yet when it is not
    form_of = {(o['source'], o['catalogue_id']): o for o in rows if o['category'] == 'form'}
    for o in rows:
        cid = o.get('contract_id') or (o.get('_cid'))
        if o['kind'] not in ('contract', 'contract-field') or not cid:
            continue
        f = form_of.get((o['source'], cid))
        if not f:
            continue
        o['sector'], o['step'], o['contract_of'] = f['sector'], f['step'], cid
        if f['status'] in ('Platform rule stricter', 'Legal review', 'Lower priority'):
            o['status'], o['evidence'] = f['status'], f['evidence']
            o['missing'] = f'Part of {cid}: ' + (f['missing'] or '')
            if f.get('legal_review'):
                o['legal_review'] = True
        else:
            o['status'] = 'Partial' if f['status'] in ('Met', 'Partial') else 'Not yet'
            o['evidence'] = f['evidence']
            o['missing'] = f'Field of {cid} as the contract defines it (type, validation, classification, source) in the form library and the procedure' if o['status'] == 'Partial' \
                else f'{cid} is not built: ' + (f['missing'] or '')
        if o['step'] == '—':
            o['step'] = 'I1' if o['status'] not in ('Platform rule stricter',) else '—'
        o['also_steps'] = ','.join(x for x in ['I1-catalogue'] if x != o['step'])
    for o in rows:
        o.pop('_tag', None)
    return rows, checks, markdown(rows, checks)


STATUSES = ['Met', 'Partial', 'Not yet', 'Legal review', 'Platform rule stricter', 'Country decision', 'Lower priority']
STEPS = ['—', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10', 'I11', 'I12', 'I13', 'Throughout', 'Unassigned']


def esc(s):
    return (s or '').replace('|', '\\|').replace('\n', ' ')


def counts(rows, key, keys, label):
    hdr = f'| {label} | ' + ' | '.join(STATUSES) + ' | Total |\n|' + '---|' * (len(STATUSES) + 2) + '\n'
    out = []
    for k in keys:
        rs = [o for o in rows if key(o) == k]
        if not rs:
            continue
        c = collections.Counter(o['status'] for o in rs)
        out.append(f'| {k} | ' + ' | '.join(str(c.get(s, 0)) for s in STATUSES) + f' | {len(rs)} |')
    c = collections.Counter(o['status'] for o in rows)
    out.append('| **All** | ' + ' | '.join(f'**{c.get(s, 0)}**' for s in STATUSES) + f' | **{len(rows)}** |')
    return hdr + '\n'.join(out) + '\n'


def part_label(o):
    sup = 'SUPPLEMENT' in o['source']
    if o['part'] == 0:
        return 'Before part 1 (plan, contract rules)' if not sup else 'Supplement: shared contract standard'
    if sup and o['part'] <= 13:
        return f"Part {o['part']} (supplement, Stage B contracts)"
    return f"Part {o['part']}"


def markdown(rows, checks):
    md = []
    md.append('\n## Source 2: the forms catalogue (parts 1–13 and the supplement, parts 14–22)\n')
    md.append('Every item of ChatGPT\'s *Complete Government Form System* (`docs/forms-catalogue/`: one 13-part series in five files, all parts received) and of its '
              '*Supplementary Government Form System* (parts 14–22 and baseline JSON contracts for the core forms of parts 5–13), index '
              '`docs/forms-catalogue/README.md`, as a row read against the code on 21 October 2026. Owner\'s binding instruction: the text is never '
              'summarised; every item is measured against the work and its gap closed stage by stage; forms may be built above the catalogue\'s standard, never below. '
              'Rows: `parse_catalogue.py` (mechanical extraction), `catalogue_rules.py` (status and step knowledge base), `catalogue.py` (assembly and checks).\n')
    md.append('**How rows were made.** One row per catalogue ID (form or workflow, register, country configuration, exchange, integration, values source, field group; '
              'id = the catalogue ID, its cells kept verbatim in `cells`); per data-contract line (contract table rows, `- field: …` specifications, every field of every '
              'JSON contract with its full definition, every other key of a JSON contract, every property of a TypeScript contract example); per list item, numbered '
              'item and prose sentence (safeguards, must and must-not statements, scope); per workflow stage (title with its explanation); per state of each state '
              'diagram; per acceptance and activation gate; per engineering deliverable and plan block; per permission identifier. Every content line of every file is '
              'a row or part of one, or is accounted for as a heading, a table header, a label carried by the rows below it (`lead`), or an informative line (the '
              'chat\'s running title, "Next:" previews, "Part N is complete" notes). Other rows have ids `FC<part>-<section>-<nn>` (supplement `FCS…`); a catalogue ID '
              'that recurs gets `@P<part>`.\n')
    md.append('**Two statuses per form row.** `status` measures the code against the item, as for the specification (Met, Partial, Not yet, Platform rule '
              'stricter, Country decision, Lower priority) plus **Legal review** (built only after the judiciary\'s and the country\'s legal review, as unapproved '
              'drafts, step I11 or I12; `legal_review: true`). `form_status` is the form\'s place in the register (owner\'s direction 2026-10-21, '
              '`docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md`): exactly one of catalogued, contract_missing, contract_draft, under_review, blocked, '
              'excluded, approved, production, derived by the extractor from the files and the checked-in scope list `docs/requirements/form-scope.json` (each entry '
              'cites its CLAUDE.md or plan rule): excluded (flag `excluded_pending_scope_review`) > under_review (flag `requires_legal_review`) > blocked (its contract '
              'carries a field outside the approved scope) > contract_draft (a JSON contract was given; none has passed validation) > contract_missing. Nothing in '
              'the catalogue is approved or in production, and no status is ever set by hand to approved: a missing contract is never an empty, approved or complete '
              'form. Every form row also carries `contract`: `given` (the text gives its contract), `given (CivicOS library)` (the text gives none; CivicOS wrote one '
              'in a controlled batch, `contract_file` names it, held to the same scope) or `not yet given`. Verified counts, contract matching, incomplete contracts, duplicate IDs, '
              'scope violations and gates: `docs/forms-catalogue/GAP-REPORT.md` (generated).\n')
    md.append('*Platform rule stricter* means CivicOS will not hold the item at all (cited rule); the row says what it holds instead. Rows with basis `domain` are '
              'assessed at the level of their domain (no item-specific rule): the status is the domain\'s state and the step the domain\'s step; a contract and its '
              'fields follow the form they define. Every catalogue form carries `I1-catalogue` in `also_steps`: its field contract designed in the form library at '
              'or above the catalogue\'s standard, beside the sector step that builds its procedure. Steps I12 and I13 were added to the plan for the catalogue (plan §5).\n')
    forms = [o for o in rows if o['category'] == 'form']
    md.append(f"**Self-check.** Content lines not accounted for: {len(checks['unaccounted'])}. Headings (parts, sections, sub-sections) without a row: "
              + ('none' if not checks['zero'] else ', '.join(f'{s} part {p} {i}' for s, l, p, i, t in checks['zero']))
              + f". Catalogue IDs without a row: {len(checks['ids_missing'])}. Rows without a step: {sum(1 for o in rows if o['step'] == 'Unassigned')}. "
              f"Forms: {len(forms)}, with their own JSON contract: {sum(1 for o in forms if o['contract'] == 'given')}, with a contract CivicOS wrote (form library): "
              f"{sum(1 for o in forms if o['contract'] == LIBRARY_GIVEN)}, contract not yet given: {sum(1 for o in forms if o['contract'] not in CONTRACT_GIVEN)}.\n")
    fc = collections.Counter(o['form_status'] for o in forms)
    md.append('**Form status.** ' + ', '.join(f'{k} {fc.get(k, 0)}' for k in FORM_STATUSES) + '.\n')
    md.append('**Inputs.** All 13 parts and the supplement received. The topics the 13 parts left out are now catalogued by the supplement (table below); the earlier '
              'gap rows became the supplement\'s rows. Still missing from the received text: the field contract of every form listed only in a table '
              '(`contract: not yet given`).\n')
    md.append('| Topic the 13 parts left out | Catalogued by |\n|---|---|')
    for t, p in GAP_PARTS:
        md.append(f'| {t} | ' + (f'Supplement part {p}' if isinstance(p, int) else f'Supplement {p}') + ' |')
    if checks.get('collisions'):
        md.append(f"\n**Catalogue IDs reused with another meaning ({len(checks['collisions'])}).** The catalogue's own rule is that a form ID is never reused; these "
                  'IDs name different forms in different places. Each occurrence is its own row (`@P<part>`); the form library must give them distinct IDs (I1-catalogue).\n')
        md.append('| ID | Occurrences (file: title) |\n|---|---|')
        for k, v in sorted(checks['collisions'].items()):
            md.append(f"| {k} | " + '; '.join(f'{f}: {esc(t)}' for f, t in v) + ' |')
    md.append(f'\n### Totals\n\n{len(rows)} rows, {sum(1 for o in rows if o.get("catalogue_id"))} with a catalogue ID.\n')
    labels = []
    for o in sorted(rows, key=lambda o: ('SUPPLEMENT' in o['source'], o['part'])):
        if part_label(o) not in labels:
            labels.append(part_label(o))
    md.append(counts(rows, part_label, labels, 'Part'))
    md.append('\n### By plan step\n\n' + counts(rows, lambda o: o['step'], STEPS, 'Step'))
    also = collections.Counter(x for o in rows for x in o['also_steps'].split(',') if x)
    md.append('\nAlso-steps (a row\'s further steps): ' + ', '.join(f'{k} {v}' for k, v in sorted(also.items())) + '.\n')
    secs = []
    for o in rows:
        if o['sector'] not in secs:
            secs.append(o['sector'])
    md.append('\n### By sector\n\n' + counts(rows, lambda o: o['sector'], secs, 'Sector'))
    md.append('\n### By category\n\n' + counts(rows, lambda o: o['category'], sorted({o['category'] for o in rows}), 'Category'))
    dev = [o for o in rows if o['status'] in ('Platform rule stricter', 'Legal review')]
    md.append(f'\n### Deviations: platform rule stricter and legal review ({len(dev)} rows)\n')
    md.append('Every row where the catalogue goes beyond a binding platform rule. *Platform rule stricter*: CivicOS will not hold it; *Legal review*: drafts only after '
              'legal review (I11, I12). The columns give the rule and what CivicOS holds, and what it will not hold or what the review must settle.\n')
    md.append('| ID | Source lines | Item | Status | Rule and what CivicOS holds | What CivicOS will not hold / what review must settle | Step |\n|---|---|---|---|---|---|---|')
    for o in dev:
        md.append(f"| {o['id']} | {o['source'].split('/')[-1]} {o['lines']} | {esc(o['text'][:200])} | {o['status']} | {esc(o['evidence'][:260])} | {esc(o['missing'][:220])} | {o['step']} |")
    rp = [o for o in rows if o.get('restricted_personal_data')]
    if rp:
        md.append(f'\n### Restricted personal data noted by the supplement ({len(rp)} rows)\n')
        md.append('| ID | Item | Rule |\n|---|---|---|')
        for o in rp:
            md.append(f"| {o['id']} | {esc(o['text'][:160])} | {esc(o['evidence'][:300])} |")
    md.append('\n### Catalogue register by part and sector\n')
    for lab in labels:
        prs = [o for o in rows if part_label(o) == lab]
        md.append(f"\n#### {lab} — {esc(prs[0]['section_path'].split(' › ')[0])} ({prs[0]['source'].split('/')[-1]})\n")
        ss = []
        for o in prs:
            if o['sector'] not in ss:
                ss.append(o['sector'])
        for sct in ss:
            rs = [o for o in prs if o['sector'] == sct]
            c = collections.Counter(o['status'] for o in rs)
            md.append(f"\n##### {sct} — " + ', '.join(f"{k} {c[k]}" for k in STATUSES if c.get(k)) + '\n')
            md.append('| ID | Lines | Section | Cat. | Item | Status | Evidence | Missing | Step |\n|---|---|---|---|---|---|---|---|---|')
            for o in rs:
                step = o['step'] + (f" (+{o['also_steps']})" if o['also_steps'] else '')
                md.append(f"| {o['id']} | {o['lines']} | {o['section']} | {o['category']} | {esc(o['text'][:240])} | {o['status']} | {esc(o['evidence'][:140])} | {esc(o['missing'][:140])} | {step} |")
    return '\n'.join(md) + '\n'
