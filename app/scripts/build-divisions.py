"""Build src/lib/geo/divisions.json from ISO 3166-2.

Source: the iso-codes ISO 3166-1/3166-2 databases shipped with pycountry
(https://pypi.org/project/pycountry/). Usage:

  pip download pycountry --no-deps -d /tmp/pyc && cd /tmp/pyc && unzip -o pycountry-*.whl
  python3 scripts/build-divisions.py /tmp/pyc/pycountry/databases

Output: { "<ISO3>": [[code, name, type, parent?], ...] }, one row per
official subdivision, used by setup to seed a nation's regions.
"""
import json, os, sys

db = sys.argv[1]
c1 = json.load(open(os.path.join(db, 'iso3166-1.json')))['3166-1']
c2 = json.load(open(os.path.join(db, 'iso3166-2.json')))['3166-2']
iso3 = {c['alpha_2']: c['alpha_3'] for c in c1}
out = {}
for s in c2:
    cc = s['code'].split('-')[0]
    row = [s['code'], s['name'], s['type']]
    if s.get('parent'):
        p = s['parent']
        row.append(p if '-' in p else f'{cc}-{p}')
    out.setdefault(iso3[cc], []).append(row)
here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(here, '..', 'src', 'lib', 'geo', 'divisions.json')
with open(dest, 'w') as f:
    json.dump(dict(sorted(out.items())), f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} countries, {sum(map(len, out.values()))} subdivisions -> {os.path.relpath(dest)}')
