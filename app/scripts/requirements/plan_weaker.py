"""The 16 places where the first plan text was weaker than the specification, and how the revised plan
(docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md, 21 Oct 2026) resolves each. Included in the register by extract.py."""

ITEMS = [
    ('Pre-filled deadlines and appeal periods in reference procedures', 'l.249, l.1241; CLAUDE.md deadlines rule',
     'Addressed', 'I1: "law-dependent deadlines and appeal periods moved out of code into package configuration set by the nation"'),
    ('Standards treated as informative (GFSM, WCO, OCDS, tax administration, ICAO 9303)', 'l.137, l.153, l.163, l.175, l.366, l.547, l.876, l.1491',
     'Addressed', '§4 "Standards … not informative … the domain\'s step builds a versioned mapping and a conformance test"; Throughout row'),
    ('I2: internal administration workspace; composite readiness score; per-item completeness', 'l.964-981, l.1997, l.2029, l.3378, l.3991, l.4035',
     'Addressed', 'I2 adds the internal administration workspace (spec §10) and "completeness per item (owner, date, next action) replacing the composite readiness score"; I0.2 stops the score gating activation'),
    ('§3.1 form contract: missing field types, data classes, entered-versus-verified, policy versions, save and resume', 'l.449-456, l.467, l.493, l.987-995, l.1520, l.1770, l.1772, l.2288, l.4350-4351',
     'Addressed', 'I1 lists every type and class the 16 contracts use, "entered-versus-verified source on every value", evidence-policy and declaration-text versions, save and resume, all 16 forms with a conformance test'),
    ('§3.2 indicators: approved-aggregate disclosure rule; per-domain qualifications', 'l.1001, l.1023-1024, l.2700-2713',
     'Addressed', 'I3: "approved-aggregate disclosure rule (small-cell suppression), per-domain qualifications (spec Part 3 F)"'),
    ('I4 health only: non-health professions, training-provider accreditation, assigned inspectors, role scoping', 'l.1317, l.1326-1327, l.1336-1337, l.1369, l.1788, l.1799',
     'Addressed, one remainder', 'I4: inspections "recorded as findings under an assigned inspector\'s account", "roles scoped by facility, jurisdiction and task"; I6: "Professional licensing beyond health". Remainder: health programme, supply and complaint records (l.1312, l.1317, l.1326-1327) are not named in I4\'s text; their rows are I4 by this register'),
    ('I5: petitions, appointments, publications; ledger, debt, transfers, close; procurement after award; tax and customs extensions', 'l.213-232, l.319-340, l.404-412, l.535-541, l.627-632, l.860-876',
     'Addressed', 'I5 "Economic group (Part 1) in full" names each'),
    ('I6: identity authority, passports, education, employment services, agriculture, water permits, device management, paper intake', 'l.1124-1128, l.1207-1209, l.1395-1401, l.1469, l.1545-1552, l.1670-1678, l.1741-1757, l.1928-1950',
     'Addressed', 'I6 "Human services (Part 2) in full" names each'),
    ('I7: energy, environment, transport, public works, housing, mapping extensions, encumbrances and disputes', 'l.2416-2436, l.2483-2491, l.2550-2557, l.2584-2677',
     'Addressed', 'I7 "Territory and infrastructure (Part 3) in full" names each'),
    ('I8: legislature extensions, human-rights monitoring, data-protection registers, audit-entry fields', 'l.2872-2890, l.3053-3055, l.3097-3101, l.3861-3866',
     'Addressed, one remainder', 'I8 names legislature extensions, data-protection registers, breach notifications, investigations and the new audit entry format. Remainder: the human rights institution\'s monitoring visits and thematic inquiries (l.3097-3101) and DPIA records (l.3055) are not named; their rows are I8 by this register'),
    ('I9: keys, release signatures, inbound receiver, degraded state, API contract, control plane, infrastructure controls', 'l.3493-3525, l.3578, l.3665-3677, l.3742-3750, l.3876-3887, l.3905-3918, l.4055',
     'Addressed', 'I9 "Federation and portability (Part 5) in full" names each'),
    ('I10: navigation by permission, typography and spacing tokens, screen-reader and human testing', 'l.4155-4165, l.4222, l.4419',
     'Addressed', 'I10 names tokens for typography and spacing, navigation by permission, screen-reader and human usability testing; I2 also filters navigation by permission'),
    ('I11: court-side extensions', 'l.2091-2097, l.2109-2110, l.2121-2122, l.2152',
     'Addressed', 'I11 lists court-side extensions (fees and waivers, e-filing, service records, orders and warrants, assignment method, corrections and appeals as events, redacted publication, procedural roles)'),
    ('Privileged roles: security officer, legal-authority administrator', 'l.3323-3330',
     'Addressed', 'I8: "security officer and legal-authority administrator roles"'),
    ('Attribute scoping by facility, jurisdiction, task and geography', 'l.1369, l.1929, l.2150, l.2522',
     'Addressed', 'I2: "attribute scoping of roles by facility, jurisdiction and task"; I4 and I6 (field assignment by geography and action)'),
    ('Installation modes: separate credentials, mode change process, jobs and webhooks within the boundary', 'l.4496-4502',
     'Addressed', 'I0.2 (no real notifications or webhooks from training and demo) and Throughout row (separate credentials, authorised mode change, jobs and webhooks keep to the boundary)'),
]


def markdown():
    out = ['## Plan text weaker than the specification — resolution',
           '',
           'The first plan text covered less than the specification in 16 places (found by this register on 21 October 2026). '
           'The revised plan (`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md` §4–§5) resolves them as follows.',
           '',
           '| # | Area | Spec lines | Resolution | Revised plan wording |',
           '|---|---|---|---|---|']
    for n, (area, lines, status, wording) in enumerate(ITEMS, 1):
        out.append(f'| {n} | {area} | {lines} | {status} | {wording} |')
    return '\n'.join(out) + '\n'
