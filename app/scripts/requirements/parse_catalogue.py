"""Mechanical extraction of the forms catalogue (docs/forms-catalogue/*.md) into requirement rows.

The catalogue is plain text as the chat window delivered it: part titles
("Part 8 of 13 — ..."), numbered section headings ("2. Agriculture ..."),
sub-headings ("2.1 Agricultural form catalogue"), tab-separated tables,
"- " lists, "- [ ] " acceptance gates, numbered items and workflow stages
(a title with its explanation on an indented line), lettered and "01" blocks,
TypeScript contract examples, state diagrams copied as one run of state names,
and prose. Every content line becomes a row or part of one, or is accounted
for (heading, table header, label carried by the rows below it as `lead`,
or an informative line listed in the register). `parse()` returns
(rows, headings, accounted) and `unaccounted()` lists any line left over.

Headings: a line "N. Title" is a section heading when N is the next section
number of the part, the title has no closing full stop and no colon, the line
after it is not an indented explanation (a workflow stage), and the line
before it is not item N-1 of a numbered list. "N.M Title" is a sub-heading of
section N. app/src/lib/requirements/requirements.test.ts applies the same rule.
"""
import re

ID_RX = re.compile(r'^((?:[A-Z]{2,5}-)+\d{3})$')
FIELD_ID_RX = re.compile(r'^[a-z][a-z0-9_]*(?:\.[a-z0-9_-]+)+$')
LIST_ID_RX = re.compile(r'^([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+|(?:[A-Z]{2,5}-)+\d{3}) — (.+)$')
FIELD_SPEC_RX = re.compile(r'^([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+): ')
GROUP_RX = re.compile(r'^ID: (\S+) · ')
FPART_RX = re.compile(r'^Part (\d+)(?: of 13)?(?: —|\.) (.+)$')
FSUB_RX = re.compile(r'^(\d+)\.(\d+) (\S.*)$')
PERM_RX = re.compile(r'^[a-z_]+(?:\.[a-z_]+){2,}$')
PART_RX = re.compile(r'^Part (\d+) of 13 — (.+)$')
SEC_RX = re.compile(r'^(\d+)\. (.+)$')
SUB_RX = re.compile(r'^(\d+)\.(\d+) (\S.*)$')
NUM_RX = re.compile(r'^(\d+)\. (.+)$')
BLOCKNUM_RX = re.compile(r'^0(\d)$')
LETTER_RX = re.compile(r'^([A-D])\. (.+)$')

# State diagrams the chat window copied as one run of names (the CSS was removed; see the file's note).
STATES = {
    'DraftSubmittedValidationInformationRequiredAssessmentInspectionDecisionPendingApprovedRefusedActiveRenewalDueSuspendedExpiredRevokedReviewRequestedReviewDecisionSurrendered':
        ['Draft', 'Submitted', 'Validation', 'InformationRequired', 'Assessment', 'Inspection', 'DecisionPending', 'Approved', 'Refused',
         'Active', 'RenewalDue', 'Suspended', 'Expired', 'Revoked', 'ReviewRequested', 'ReviewDecision', 'Surrendered'],
    'ReportedTriageInformationGatheringReferredInvestigationSupervisoryReviewReferredToProsecutionClosedFurtherInformationRequestedProsecutorialDecisionReopeningReview':
        ['Reported', 'Triage', 'InformationGathering', 'Referred', 'Investigation', 'SupervisoryReview', 'ReferredToProsecution', 'Closed',
         'FurtherInformationRequested', 'ProsecutorialDecision', 'ReopeningReview'],
    'DraftSubmittedAuthorityCheckRejectedAcceptedInProgressAwaitingExternalDecisionInformationRequiredExceptionReviewEscalatedCompletedWithdrawn':
        ['Draft', 'Submitted', 'AuthorityCheck', 'Rejected', 'Accepted', 'InProgress', 'AwaitingExternalDecision', 'InformationRequired',
         'ExceptionReview', 'Escalated', 'Completed', 'Withdrawn'],
}
for k, v in STATES.items():
    assert ''.join(v) == k, k

# Lines that state no requirement: the chat's running title, the "Next:" previews and closing notes.
INFORMATIVE = re.compile(r'^(CivicOS — Complete Government Form System$|Next: |Part \d+ is complete as a catalogue|The 13-part catalogue is now complete\.$|The final part will bring|It will also define how the 13 parts|\[Diagram styling from the chat window removed here)')

SENT_SPLIT = re.compile(r'(?<=[.!?;])\s+(?=[A-Z“"])')


def sentences(s):
    out = [x.strip() for x in SENT_SPLIT.split(s.strip()) if x.strip()]
    # never split "e.g." / "i.e."
    merged = []
    for x in out:
        if merged and re.search(r'\b(e\.g|i\.e|etc)\.$', merged[-1]):
            merged[-1] += ' ' + x
        else:
            merged.append(x)
    return merged


def is_label(s):
    """A short title line with no sentence punctuation: carried by the rows below it."""
    return len(s) <= 80 and not s.endswith(('.', ';', '?')) and '\t' not in s and not s.startswith('- ') \
        and not NUM_RX.match(s) and not BLOCKNUM_RX.match(s)


def is_stage(lines, i):
    """A workflow stage: 'N. Title' (no full stop) whose explanation follows on an indented line, or after a blank
    line as one prose sentence (not a list, table, heading, lettered or numbered line). Returns the explanation's
    index or None."""
    s = lines[i].strip()
    if not NUM_RX.match(s) or s.endswith('.'):
        return None
    nxt = lines[i + 1] if i + 1 < len(lines) else ''
    if nxt.strip():
        return None
    k = i + 1
    while k < len(lines) and not lines[k].strip():
        k += 1
    if k >= len(lines):
        return None
    if re.match(r'^ {3}', nxt):
        return k
    d = lines[k].strip()
    if NUM_RX.match(d) or LETTER_RX.match(d) or BLOCKNUM_RX.match(d) or SUB_RX.match(d) or '\t' in d or d.startswith('- ') \
            or not d.endswith('.'):
        return None
    return k


def headings(lines):
    """[(line, part, id, title, kind)]: kind 'part', 'sec' or 'sub'; the same rule as the vitest.

    Catalogue style: 'N. Title' is section N when N is the next number, the title has no full stop or colon, it is
    not a workflow stage (is_stage), the line before it does not end with a colon and is not item N-1 of a list;
    'N.M Title' is then a sub-section of N. Field-contract style (a part with no 'N.' sections): 'P.M Title' of
    part P is a section. Part titles: 'Part N of 13 — Title' or 'Part N — Title', not ending with a full stop."""
    out = []
    part, cur, field, prev = None, 0, False, ''
    for i, raw in enumerate(lines):
        n, s = i + 1, raw.strip()
        m = FPART_RX.match(s)
        if m and not s.endswith('.'):
            part, cur, field = int(m.group(1)), 0, False
            out.append((n, part, 'part', m.group(2), 'part'))
        elif part is not None:
            m = SEC_RX.match(s)
            pm = NUM_RX.match(prev)
            if not field and m and int(m.group(1)) == cur + 1 and not s.endswith('.') and ':' not in m.group(2) and len(s) < 100 \
                    and is_stage(lines, i) is None and not (pm and int(pm.group(1)) == cur) and not prev.endswith(':'):
                cur = int(m.group(1))
                out.append((n, part, str(cur), m.group(2), 'sec'))
            else:
                m = SUB_RX.match(s)
                if m and cur > 0 and int(m.group(1)) == cur:
                    out.append((n, part, f'{m.group(1)}.{m.group(2)}', m.group(3), 'sub'))
                elif m and cur == 0 and int(m.group(1)) == part:
                    field = True
                    out.append((n, part, f'{m.group(1)}.{m.group(2)}', m.group(3), 'sec'))
        if s:
            prev = s
    return out


def parse(path, prefix, series='catalogue'):
    lines = open(path, encoding='utf-8').read().split('\n')
    heads = headings(lines)
    hmap = {h[0]: h for h in heads}
    # content starts after the provenance note's '---'
    start = lines.index('---') + 1
    rows, accounted = [], {}
    part = 0
    part_title = 'Before the first part (delivery plan, contract rules)'
    sec, sec_title, sub, sub_title = 'intro', '', None, ''
    lead, lead_line = None, None
    table_header = None
    i = start
    N = len(lines)

    def section():
        return sub or sec

    def path_of():
        p = f'Part {part}'
        if sec != 'intro':
            p += f' › {sec} {sec_title}'
        if sub:
            p += f' › {sub} {sub_title}'
        return p

    def add(kind, text, ln, ln_to=None, **kw):
        nonlocal lead
        r = dict(kind=kind, text=text, part=part, section=section(), top=sec, section_title=sub_title if sub else sec_title,
                 top_title=sec_title, path=path_of(), line=ln, lines_to=ln_to or ln, lead=lead, source=path, prefix=prefix, **kw)
        rows.append(r)
        return r

    def acc(n, why):
        accounted[n] = why

    while i < N:
        n = i + 1
        raw = lines[i]
        s = raw.strip()
        if not s:
            i += 1
            continue
        if INFORMATIVE.match(s):
            acc(n, 'informative')
            i += 1
            continue
        if n in hmap:
            h = hmap[n]
            if h[4] == 'part':
                part, part_title = h[1], h[3]
                sec, sec_title, sub, sub_title = 'intro', part_title, None, ''
            elif h[4] == 'sub':
                sub, sub_title = h[2], h[3]
            else:
                sec, sec_title, sub, sub_title = h[2], h[3], None, ''
            lead, table_header = None, None
            acc(n, 'heading')
            i += 1
            continue
        if part is None:
            acc(n, 'before part')
            i += 1
            continue
        if raw == '{':
            j = i
            while lines[j] != '}':
                j += 1
            json_rows(lines, i, j, add, acc)
            i = j + 1
            continue
        # tables
        if '\t' in raw:
            cells = [c.strip() for c in raw.split('\t')]
            prev = lines[i - 1] if i > 0 else ''
            if table_header is None or '\t' not in prev:
                table_header = cells
                acc(n, 'table header')
                i += 1
                continue
            m = ID_RX.match(cells[0]) or FIELD_ID_RX.match(cells[0])
            if m:
                add('catalogue', ' — '.join(cells), n, catalogue_id=cells[0], cells=dict(zip(table_header, cells)), table_header=table_header)
            else:
                add('table', ' — '.join(cells), n, cells=dict(zip(table_header, cells)), table_header=table_header)
            acc(n, 'row')
            i += 1
            continue
        table_header = None
        # state diagram runs
        if s in STATES:
            for k, st in enumerate(STATES[s], 1):
                add('state', f'State {k} of {len(STATES[s])}: {st}', n, state=st)
            acc(n, 'row')
            i += 1
            continue
        # TypeScript contract examples
        if s.startswith('type '):
            j = i
            name = re.match(r'type (\w+)', s).group(1)
            if s.endswith('{'):
                cur = None
                j = i + 1
                depth = 1
                while j < N:
                    t = lines[j]
                    ts = t.strip()
                    if ts == '};' and depth == 1:
                        break
                    ind = len(t) - len(t.lstrip(' '))
                    if ind == 2 and re.match(r'^\w+\??:', ts):
                        cur = add('contract-field', f'{name}.{ts}', j + 1, contract=name)
                        if ts.endswith('{'):
                            depth += 1
                    elif ts:
                        if ts == '};' and depth > 1:
                            depth -= 1
                        if cur is not None:
                            cur['text'] += ' ' + ts
                            cur['lines_to'] = j + 1
                    acc(j + 1, 'row')
                    j += 1
                acc(n, 'contract name')
                acc(j + 1, 'row')
            else:
                parts = []
                j = i + 1
                while j < N and lines[j].strip().startswith('|'):
                    parts.append(lines[j].strip().lstrip('| ').rstrip(';'))
                    acc(j + 1, 'row')
                    j += 1
                add('contract-field', f'type {name} = ' + ' | '.join(parts), n, j, contract=name)
                acc(n, 'row')
                j -= 1
            i = j + 1
            continue
        # "01" engineering blocks: number, title, description
        m = BLOCKNUM_RX.match(s)
        if m:
            k = i + 1
            got = []
            while k < N and len(got) < 2:
                if lines[k].strip():
                    got.append((k + 1, lines[k].strip()))
                k += 1
            add('plan-block', f'{s} {got[0][1]}: {got[1][1]}', n, got[1][0])
            for x in [n] + [g[0] for g in got]:
                acc(x, 'row')
            i = k
            continue
        # gates
        if s.startswith('- [ ] '):
            add('gate', s[6:], n)
            acc(n, 'row')
            i += 1
            continue
        if s.startswith('- '):
            t = s[2:]
            mi = LIST_ID_RX.match(t)
            if mi:
                add('catalogue', t, n, catalogue_id=mi.group(1), cells={'Form ID': mi.group(1), 'Purpose': mi.group(2)})
            elif FIELD_SPEC_RX.match(t):
                add('field-spec', t, n, field_id=FIELD_SPEC_RX.match(t).group(1))
            elif t.startswith('country.') and PERM_RX.match(t):
                add('catalogue', t, n, catalogue_id=t, cells={'Configuration ID': t})
            elif PERM_RX.match(t):
                add('permission', t, n, permission=t)
            else:
                add('list', t, n)
            acc(n, 'row')
            i += 1
            continue
        m = NUM_RX.match(s)
        if m:
            k = is_stage(lines, i)
            if k is not None:
                # workflow stage: title, then its explanation
                add('stage', f'{s}: {lines[k].strip()}', n, k + 1, n_item=int(m.group(1)))
                for x in range(n, k + 2):
                    acc(x, 'row')
                i = k + 1
                continue
            add('numbered', s, n, n_item=int(m.group(1)))
            acc(n, 'row')
            i += 1
            continue
        m = LETTER_RX.match(s)
        if m and len(s) < 100:
            k = i + 1
            while k < N and not lines[k].strip():
                k += 1
            add('block', f'{s}: {lines[k].strip()}', n, k + 1)
            acc(n, 'row')
            acc(k + 1, 'row')
            i = k + 1
            continue
        mg = GROUP_RX.match(s)
        if mg:
            add('catalogue', s, n, catalogue_id=mg.group(1), cells={'Group ID': mg.group(1)})
            acc(n, 'row')
            i += 1
            continue
        if is_label(s):
            # label followed by blank line and a single description line: a block (portal tiles, twin layers, architecture tiers)
            nxt = lines[i + 1].strip() if i + 1 < N else ''
            k = i + 1
            while k < N and not lines[k].strip():
                k += 1
            desc = lines[k].strip() if k < N else ''
            if not nxt and desc and not is_label(desc) and not desc.startswith(('- ', 'type ')) and '\t' not in desc and k + 1 not in hmap \
                    and not NUM_RX.match(desc) and not BLOCKNUM_RX.match(desc):
                add('block', f'{s}: {desc}', n, k + 1)
                acc(n, 'row')
                acc(k + 1, 'row')
                i = k + 1
                continue
            lead, lead_line = s, n
            acc(n, 'label')
            i += 1
            continue
        # prose: one row per sentence; a sentence ending with ':' also leads the list below it
        for snt in sentences(s):
            add('sentence', snt, n)
        acc(n, 'row')
        if s.endswith(':'):
            lead = s
        i += 1
    return rows, heads, accounted, lines, start


def json_rows(lines, i, j, add, acc):
    """A JSON contract block (lines i..j, 0-based, '{' to '}'): a header row, one row per field, per key of each
    object-valued key, per item of each list-valued key, and per scalar key of a contract without fields. A block
    of several contracts ("contracts": [...]) gives a row per contract and per field of each."""
    import json
    block = lines[i:j + 1]
    obj = json.loads('\n'.join(block))

    def line_of(pat, start=0):
        for k in range(max(start, 0), len(block)):
            if pat in block[k]:
                return i + 1 + k
        return i + 1

    def fid(f):
        return f.get('id') or f.get('field_id') or f.get('key')

    def fields_rows(cid, fields, base):
        starts = []
        pos = base - i - 1
        for f in fields:
            ln = line_of(f'"{fid(f)}"', pos)
            starts.append(ln)
            pos = ln - i
        for k, f in enumerate(fields):
            end = max(starts[k], (starts[k + 1] - 1) if k + 1 < len(fields) else starts[k])
            body = {x: y for x, y in f.items() if x not in ('id', 'field_id') and not (x == 'key' and 'field_id' not in f and 'id' not in f)}
            add('contract-field', f'{cid} field {fid(f)}: ' + json.dumps(body, ensure_ascii=False), starts[k], end, contract_id=cid, field_id=fid(f))

    if 'contracts' in obj:
        add('contract-set', 'Contracts for domain ' + str(obj.get('domain')) + f' ({len(obj["contracts"])} contracts)', i + 1)
        pos = 0
        for c in obj['contracts']:
            cid = c.get('form_id')
            ln = line_of(f'"form_id": "{cid}"', pos)
            pos = ln - i
            scal = {k: v for k, v in c.items() if k != 'fields'}
            add('contract', f'Contract {cid}: ' + json.dumps(scal, ensure_ascii=False) + f' ({len(c.get("fields", []))} fields)', ln, contract_id=cid)
            fields_rows(cid, c.get('fields', []), ln)
    elif 'fields' in obj:
        cid = obj.get('form_id') or obj.get('group_id') or obj.get('schema_version')
        scal = {k: v for k, v in obj.items() if not isinstance(v, (dict, list)) or v == []}
        add('contract', f'Contract {cid}: ' + json.dumps(scal, ensure_ascii=False), i + 1, contract_id=cid)
        fields_rows(cid, obj['fields'], i + 1)
        for key, v in obj.items():
            if key == 'fields' or key in scal:
                continue
            ln = line_of(f'  "{key}":')
            if isinstance(v, dict):
                for kk, vv in v.items():
                    add('contract-key', f'{cid} {key}.{kk} = ' + json.dumps(vv, ensure_ascii=False), line_of(f'"{kk}"', ln - i - 1), contract_id=cid)
            else:
                for it in v:
                    add('contract-key', f'{cid} {key}: ' + (it if isinstance(it, str) else json.dumps(it, ensure_ascii=False)),
                        line_of(it if isinstance(it, str) else '"', ln - i - 1), contract_id=cid)
    else:
        cid = obj.get('evidence_requirement_id') or obj.get('schema_version') or 'contract'
        for key, v in obj.items():
            ln = line_of(f'  "{key}":')
            if isinstance(v, dict):
                for kk, vv in v.items():
                    add('contract-key', f'{cid} {key}.{kk} = ' + json.dumps(vv, ensure_ascii=False), line_of(f'"{kk}"', ln - i - 1), contract_id=cid)
            elif isinstance(v, list) and v:
                for it in v:
                    add('contract-key', f'{key}: ' + (it if isinstance(it, str) else json.dumps(it, ensure_ascii=False)), line_of(f'"{it}"' if isinstance(it, str) else '"', ln - i - 1), contract_id=cid)
            else:
                add('contract-key', f'{cid} {key} = ' + json.dumps(v, ensure_ascii=False), ln, contract_id=cid)
    for x in range(i + 1, j + 2):
        acc(x, 'row')


def unaccounted(lines, start, accounted):
    return [(i + 1, l) for i, l in enumerate(lines) if i >= start and l.strip() and (i + 1) not in accounted]
