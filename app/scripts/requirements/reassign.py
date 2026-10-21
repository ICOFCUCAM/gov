"""Step assignment under the revised plan (docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md §5, 21 Oct 2026).

rules.py records the step each row had under the first plan text; rows that no
step's content then covered were 'Unassigned'. The revised plan raised every
step to the specification and added I0.2 (fixes to what is built) and a
'Throughout' row (installation modes, standards mappings). This module maps
each such row to its revised step, and moves the rows the revised I0.2 names.
"""
import re

# (part, sector) -> revised step for rows that were Unassigned
BY_SECTOR = {
    (1, 'Presidency and Cabinet'): 'I5', (1, 'Finance and Treasury'): 'I5', (1, 'Tax'): 'I5', (1, 'Customs'): 'I5',
    (1, 'Internal administration'): 'I2',
    (2, 'Civil registration and identity'): 'I6', (2, 'Education'): 'I6', (2, 'Immigration'): 'I6', (2, 'Labour'): 'I6',
    (2, 'Agriculture'): 'I6', (2, 'Water'): 'I6', (2, 'Professional licensing'): 'I6', (2, 'Fieldwork and legacy'): 'I6',
    (2, 'Health'): 'I4',
    (3, 'Judiciary'): 'I11', (3, 'Police'): 'I11', (3, 'Mapping and geospatial'): 'I7', (3, 'Transport'): 'I7',
    (3, 'Energy'): 'I7', (3, 'Environment'): 'I7', (3, 'Housing and building control'): 'I7', (3, 'Public works'): 'I7',
    (3, 'Exchange'): 'I7',
    (4, 'Legislature'): 'I8', (4, 'Independence contract'): 'I2', (4, 'Shared administration'): 'I2',
    (5, 'Control plane'): 'I9', (5, 'Standalone deployment'): 'I9', (5, 'APIs and events'): 'I9', (5, 'Hosting'): 'I9',
    (6, 'Production, training, demo'): 'Throughout',
}

# (part, sector, text regex) -> step, checked first
BY_TEXT = [
    (1, 'Standards', r'GFSM|budgets, commitments, accruals|update process is ongoing|WCO|OCDS|disclosure standard|taxpayer accounts', 'I5'),
    (1, 'Standards', r'.', 'Throughout'),
    (2, None, r'lifecycle approach|interoperability and design references', 'Throughout'),
    (3, 'Implementation order and risks', r'Weak continuity', 'I6'),
    (3, 'Implementation order and risks', r'.', 'I7'),
    (4, 'Authorisation and privileged roles', r'principal\.delegations', 'I2'),
    (4, 'Authorisation and privileged roles', r'.', 'I8'),
]

# rows the revised I0.2 delivers, whatever step they had (part, text regex)
I02 = [
    (6, r'Block real payments, notifications, signatures'),
    (6, r'background jobs and webhooks'),
]


def revised_step(o):
    for p, rx in I02:
        if o['part'] == p and re.search(rx, o['text'], re.I) and o['status'] not in ('Met',):
            return 'I0.2'
    if o['step'] != 'Unassigned':
        return o['step']
    for p, sec, rx, step in BY_TEXT:
        if p == o['part'] and (sec is None or sec == o['sector']) and re.search(rx, o['text'], re.I):
            return step
    return BY_SECTOR.get((o['part'], o['sector']), 'Unassigned')
