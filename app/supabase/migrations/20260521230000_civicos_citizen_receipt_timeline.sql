-- 20260521230000_civicos_citizen_receipt_timeline.sql
--
-- Phase B · citizen receipt timeline.
--
-- A signed-in citizen's view of every substrate-touching record about
-- them, unified across service_requests, consents, appeals, and the
-- transition steps of any linked work items. The RPC is SECURITY DEFINER
-- and uses auth.uid() to scope to the calling citizen — RLS on the
-- underlying tables is enforced through a join to civicos.citizens.
--
-- The substrate is the source of truth: this is the citizen's "show me
-- what you have on me" surface, the right-to-take-your-data baked into
-- the data plane itself.

set search_path = civicos, pg_catalog;

-- Return a jsonb array of timeline events sorted by at (newest first).
-- Each event: { at, kind, ref, charter, status, detail }.
create or replace function civicos.my_receipt_timeline(p_limit int default 200)
returns jsonb
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with me as (
    select id from civicos.citizens where auth_user_id = (select auth.uid())
  ),
  events as (
    -- Service requests filed by the citizen.
    select
      sr.submitted_at      as at,
      'service-request'::text as kind,
      sr.ref               as ref,
      sr.target_charter_id as charter,
      sr.status::text      as status,
      coalesce(sr.title, sr.service) as detail
    from civicos.service_requests sr
    where sr.citizen_id = (select id from me)
    union all
    -- Consents granted (or revoked) by the citizen.
    select
      coalesce(c.revoked_at, c.granted_at) as at,
      'consent'::text                      as kind,
      c.id::text                           as ref,
      c.target_charter_id                  as charter,
      c.status::text                       as status,
      c.scope                              as detail
    from civicos.consents c
    where c.citizen_id = (select id from me)
    union all
    -- Appeals filed by the citizen.
    select
      a.filed_at              as at,
      'appeal'::text          as kind,
      a.ref                   as ref,
      a.originating_charter_id as charter,
      a.status::text          as status,
      coalesce(a.ground, '—') as detail
    from civicos.appeals a
    where a.citizen_id = (select id from me)
    union all
    -- Work item transitions on items linked to the citizen's records
    -- (officer-side activity the citizen has the right to see).
    select
      s.at                    as at,
      'work-item-step'::text  as kind,
      w.ref                   as ref,
      w.originating_charter_id as charter,
      s.action::text          as status,
      coalesce(s.from_stage, '—') || ' → ' || s.to_stage as detail
    from civicos.work_item_steps s
    join civicos.work_items w on w.id = s.work_item_id
    where w.id in (
      select linked_work_item_id from civicos.service_requests
        where citizen_id = (select id from me) and linked_work_item_id is not null
      union
      select linked_work_item_id from civicos.appeals
        where citizen_id = (select id from me) and linked_work_item_id is not null
    )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'at', at, 'kind', kind, 'ref', ref, 'charter', charter,
    'status', status, 'detail', detail
  ) order by at desc), '[]'::jsonb)
  from (
    select * from events order by at desc limit greatest(1, least(p_limit, 1000))
  ) t;
$$;

-- Public wrapper.
create or replace function public.civicos_my_receipt_timeline(p_limit int default 200)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$ select civicos.my_receipt_timeline(p_limit); $$;

-- Authenticated only (anon returns nothing useful — no auth.uid()).
revoke execute on function public.civicos_my_receipt_timeline(int) from anon;
grant   execute on function public.civicos_my_receipt_timeline(int) to authenticated;
