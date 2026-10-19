-- 20261022100000_civicos_mirror_readers.sql
--
-- One owner per register (architecture review R19, finding D8), last part:
-- the app no longer reads the mirrors of platform registers. The charter
-- screens read the platform's institution register (/api/public/charters),
-- governance output is computed by the platform from its directives register
-- (/api/public/accountability, app/src/lib/data/directive-stats.ts), and
-- search asks /api/directives (app/src/lib/data/register-owners.test.ts
-- checks no app code reads civicos_institutions or civicos_directives, or
-- calls the functions below).
--
-- The substrate's own SQL over the mirrors stays, unchanged, for the
-- substrate's use; this migration only says, on each, that it reads a mirror.
-- Nothing is dropped or redefined.

set search_path = civicos, pg_catalog;

comment on function civicos.directive_stats(text, int) is
  'Reads civicos.directives, a mirror of the platform''s directives register (app/src/lib/db/mirror.ts). The app computes governance output from the register itself (/api/public/accountability); kept for the substrate''s own use.';
comment on function public.civicos_directive_stats(text, int) is
  'Reads civicos.directives, a mirror of the platform''s directives register. The app does not call it (governance output: /api/public/accountability, from the register).';

comment on function civicos.directive_trend(text, int) is
  'Reads civicos.directives, a mirror of the platform''s directives register (app/src/lib/db/mirror.ts). The app computes the trend from the register itself (/api/public/accountability); kept for the substrate''s own use.';
comment on function public.civicos_directive_trend(text, int) is
  'Reads civicos.directives, a mirror of the platform''s directives register. The app does not call it (governance output: /api/public/accountability, from the register).';

comment on function civicos.cascade_escalation() is
  'Escalation cascade trigger. Reads civicos.institutions, a mirror of the platform''s institution register (ministry registry and standing institutions), written by app/src/lib/db/mirror.ts.';

comment on table civicos.directives is
  'Mirror of the platform''s directives register (lib/data/directives.ts, /api/directives); written only by mirror_directive from the platform (app/src/lib/db/mirror.ts). The app reads the register, never this table; directive_stats and directive_trend read it for the substrate''s own use.';
comment on table civicos.institutions is
  'Mirror of the platform''s ministry registry (/api/org/ministries) and the standing branches and agencies; written only by mirror_institution from the platform (app/src/lib/db/mirror.ts) and the seed migration. The app reads the register (/api/public/charters), never this table; the substrate''s own rows and SQL (cascade_escalation) join it by charter_id.';
