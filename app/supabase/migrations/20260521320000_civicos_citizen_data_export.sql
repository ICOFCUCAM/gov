-- 20260521320000_civicos_citizen_data_export.sql
--
-- Phase B · citizen data portability (right to take your data).
--
-- my_receipt_timeline gives a citizen a unified *timeline* of records
-- about them. This goes one step further: a single self-describing export
-- document a citizen can download and carry elsewhere — their profile plus
-- the full rows of every service request, consent, and appeal they own,
-- alongside the receipt timeline for human reading.
--
-- SECURITY DEFINER + scoped to auth.uid()'s citizen, so a caller only ever
-- gets their OWN data (never another citizen's). Authenticated only — anon
-- has no auth.uid() and gets an empty document.

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
    'version', 1,
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
    'counts', jsonb_build_object(
      'service_requests', (select count(*) from civicos.service_requests where citizen_id = (select id from me)),
      'consents',         (select count(*) from civicos.consents         where citizen_id = (select id from me)),
      'appeals',          (select count(*) from civicos.appeals          where citizen_id = (select id from me))
    )
  )
  -- An anonymous / unmatched caller has no `me` row; return an explicit
  -- empty document rather than a half-built object.
  where exists (select 1 from me);
$$;

create or replace function public.civicos_my_data_export()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$ select coalesce(civicos.my_data_export(), jsonb_build_object(
  'document', 'civicos.citizen_data_export', 'version', 1,
  'generated_at', now(), 'citizen', null,
  'service_requests', '[]'::jsonb, 'consents', '[]'::jsonb, 'appeals', '[]'::jsonb,
  'receipt_timeline', '[]'::jsonb,
  'counts', jsonb_build_object('service_requests', 0, 'consents', 0, 'appeals', 0)
)); $$;

revoke execute on function public.civicos_my_data_export() from public, anon;
grant  execute on function public.civicos_my_data_export() to authenticated;
