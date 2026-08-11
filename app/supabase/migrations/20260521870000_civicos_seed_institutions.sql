-- 20260521870000_civicos_seed_institutions.sql
--
-- Phase C · seed the institution registry from the canonical manifest set.
--
-- civicos.institutions is populated lazily at runtime by registerApp(), which
-- means a fresh database starts empty: the cascade trigger finds no dependents,
-- dashboards show nothing, and posture/escalation aggregates are vacuous.
-- This migration seeds all 24 institutions declared in src/apps/manifests.ts
-- so the substrate has real data from first boot.
--
-- Idempotent: ON CONFLICT (charter_id) DO UPDATE keeps label/domain/kind in
-- sync with the manifest without disturbing any columns written at runtime
-- (activated_at, meta, officers, etc.).

set search_path = civicos, pg_catalog;

-- ── Ministries (11) ─────────────────────────────────────────────────────────
insert into civicos.institutions (charter_id, label, kind, domain, archetype_or_branch) values
  ('ministry-health',       'Ministry of Health',               'ministry', 'health',       'HEALTH'),
  ('ministry-education',    'Ministry of Education',            'ministry', 'education',    'EDUCATION'),
  ('ministry-transport',    'Ministry of Transport',            'ministry', 'transport',    'TRANSPORT'),
  ('ministry-energy',       'Ministry of Energy',               'ministry', 'energy',       'ENERGY'),
  ('ministry-finance',      'Treasury & Finance',               'ministry', 'treasury',     'FINANCE'),
  ('ministry-agriculture',  'Ministry of Agriculture',          'ministry', 'agriculture',  'AGRICULTURE'),
  ('ministry-justice',      'Ministry of Justice',              'ministry', 'justice',      'JUSTICE'),
  ('ministry-environment',  'Ministry of Environment',          'ministry', 'environment',  'ENVIRONMENT'),
  ('ministry-interior',     'Ministry of Interior',             'ministry', 'interior',     'INTERIOR'),
  ('ministry-labor',        'Ministry of Labour',               'ministry', 'labour',       'LABOR'),
  ('ministry-trade',        'Ministry of Trade & Industry',     'ministry', 'trade',        'TRADE')
on conflict (charter_id) do update set
  label               = excluded.label,
  kind                = excluded.kind,
  domain              = excluded.domain,
  archetype_or_branch = excluded.archetype_or_branch,
  updated_at          = now();

-- ── Constitutional branches (4) ──────────────────────────────────────────────
insert into civicos.institutions (charter_id, label, kind, domain, archetype_or_branch) values
  ('presidency', 'Presidency · Cabinet Office', 'branch', 'presidency', 'GENERIC'),
  ('judiciary',  'Judicial Branch',             'branch', 'judiciary',  'judiciary'),
  ('senate',     'Senate',                      'branch', 'senate',     'legislature'),
  ('assembly',   'National Assembly',           'branch', 'assembly',   'legislature')
on conflict (charter_id) do update set
  label               = excluded.label,
  kind                = excluded.kind,
  domain              = excluded.domain,
  archetype_or_branch = excluded.archetype_or_branch,
  updated_at          = now();

-- ── Agencies (7) ────────────────────────────────────────────────────────────
insert into civicos.institutions (charter_id, label, kind, domain, archetype_or_branch) values
  ('police-command',    'Police Command',                          'agency', 'police',         'INTERIOR'),
  ('emergency-response','Emergency Response',                      'agency', 'emergency',      'INTERIOR'),
  ('immigration',       'Immigration',                             'agency', 'immigration',    'INTERIOR'),
  ('customs',           'Customs',                                 'agency', 'customs',        'TRADE'),
  ('communications',    'Communications & Digital Infrastructure', 'agency', 'communications', 'GENERIC'),
  ('foreign-affairs',   'Foreign Affairs & Geopolitical Relations','agency', 'foreign',        'GENERIC'),
  ('noc',               'National Operations Centre',              'agency', 'noc',            'GENERIC')
on conflict (charter_id) do update set
  label               = excluded.label,
  kind                = excluded.kind,
  domain              = excluded.domain,
  archetype_or_branch = excluded.archetype_or_branch,
  updated_at          = now();

-- ── Citizen portal + officer console (2) ────────────────────────────────────
insert into civicos.institutions (charter_id, label, kind, domain, archetype_or_branch) values
  ('citizen-wallet',  'Citizen Super-Portal', 'citizen', 'citizen', 'GENERIC'),
  ('officer-console', 'Officer Console',      'officer', 'officer',  'GENERIC')
on conflict (charter_id) do update set
  label               = excluded.label,
  kind                = excluded.kind,
  domain              = excluded.domain,
  archetype_or_branch = excluded.archetype_or_branch,
  updated_at          = now();

-- ── Activate all seeded institutions ────────────────────────────────────────
-- registerApp() calls activate_institution() on each boot; mirror that here
-- so a fresh DB is immediately operational without waiting for a browser visit.
update civicos.institutions
   set activated    = true,
       activated_at = coalesce(activated_at, now()),
       updated_at   = now()
 where charter_id in (
   'ministry-health','ministry-education','ministry-transport','ministry-energy',
   'ministry-finance','ministry-agriculture','ministry-justice','ministry-environment',
   'ministry-interior','ministry-labor','ministry-trade',
   'presidency','judiciary','senate','assembly',
   'police-command','emergency-response','immigration','customs',
   'communications','foreign-affairs','noc',
   'citizen-wallet','officer-console'
 )
   and activated = false;
