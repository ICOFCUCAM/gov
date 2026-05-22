-- 20260521660000_civicos_data_export_audit_trail.sql
--
-- Phase B · data portability completeness — include the audit trail.
--
-- my_data_export carried profile + requests + consents + appeals + the
-- receipt timeline, but not the citizen's tamper-evident audit trail (the
-- hash-chained log of system actions on their `citizen:<id>` scope — data
-- exports, consent expiries, etc.). That log is the citizen's data too and
-- belongs in a complete portability document. Add it (version → 2).

set search_path = civicos, pg_catalog;

create or replace function civicos.my_data_export()
returns jsonb
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with me as (
    select * from civicos.citizens where auth_user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'document', 'civicos.citizen_data_export',
    'version', 2,
    'generated_at', now(),
    'citizen', (
      select jsonb_build_object(
        'id', m.id, 'national_id', m.national_id, 'display_name', m.display_name,
        'region', m.region, 'registered_at', m.registered_at, 'active', m.active,
        'meta', m.meta
      ) from me m
    ),
    'service_requests', (
      select coalesce(jsonb_agg(to_jsonb(sr) order by sr.submitted_at desc), '[]'::jsonb)
      from civicos.service_requests sr where sr.citizen_id = (select id from me)
    ),
    'consents', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.granted_at desc), '[]'::jsonb)
      from civicos.consents c where c.citizen_id = (select id from me)
    ),
    'appeals', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.filed_at desc), '[]'::jsonb)
      from civicos.appeals a where a.citizen_id = (select id from me)
    ),
    'receipt_timeline', civicos.my_receipt_timeline(1000),
    'audit_trail', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'actor', e.actor, 'action', e.action, 'subject', e.subject,
        'detail', e.detail, 'at', e.at, 'prev_hash', e.prev_hash, 'hash', e.hash
      ) order by e.seq), '[]'::jsonb)
      from civicos.audit_entries e
      where e.scope = 'citizen:' || (select id from me)::text
    ),
    'counts', jsonb_build_object(
      'service_requests', (select count(*) from civicos.service_requests where citizen_id = (select id from me)),
      'consents',         (select count(*) from civicos.consents         where citizen_id = (select id from me)),
      'appeals',          (select count(*) from civicos.appeals          where citizen_id = (select id from me))
    )
  )
  where exists (select 1 from me);
$$;

-- Keep the public wrapper's empty-caller fallback in sync (version 2 +
-- audit_trail key) so the shape is identical whether or not there's a match.
create or replace function public.civicos_my_data_export()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$ select coalesce(civicos.my_data_export(), jsonb_build_object(
  'document', 'civicos.citizen_data_export', 'version', 2,
  'generated_at', now(), 'citizen', null,
  'service_requests', '[]'::jsonb, 'consents', '[]'::jsonb, 'appeals', '[]'::jsonb,
  'receipt_timeline', '[]'::jsonb, 'audit_trail', '[]'::jsonb,
  'counts', jsonb_build_object('service_requests', 0, 'consents', 0, 'appeals', 0)
)); $$;
