-- 20261022000000_civicos_substrate_mirror.sql
--
-- One owner per register (architecture review R19, finding D8): the platform
-- owns directives and institutions; the substrate's civicos.directives and
-- civicos.institutions are mirrors of it. The platform writes them after its
-- own commit through the mirror writer (app/src/lib/db/mirror.ts), with the
-- service role, best-effort and retried; nothing else writes them.
--
-- This migration:
--   - adds mirror_directive(jsonb) and mirror_institution(...), which copy
--     the platform's record as it stands (status and times included), service
--     role only;
--   - withdraws EXECUTE from anon and authenticated on the old write RPCs
--     (record/sign/rescind_directive, register/activate_institution), so a
--     browser can no longer write a mirrored table directly. The functions
--     and tables stay; the service role (and the substrate's own SQL) can
--     still call them, and promote_due_directives stays service-role only.
-- Nothing is dropped.

set search_path = civicos, pg_catalog;

-- ── Directives ──────────────────────────────────────────────────────────────

create or replace function civicos.mirror_directive(p_row jsonb)
returns civicos.directives
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  rec civicos.directives;
  v_signer uuid;
begin
  if p_row is null or coalesce(p_row->>'ref', '') = '' then raise exception 'ref required'; end if;
  -- The platform names the signer; the substrate column is an officer id.
  -- Keep it only when it is one of the substrate's officers.
  if coalesce(p_row->>'signed_by_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_signer from civicos.officers where id = (p_row->>'signed_by_id')::uuid;
  end if;

  insert into civicos.directives
    (id, ref, kind, issued_by_charter_id, issued_by_name, title, citation, status,
     targets, payload, signed_at, signed_by_id, effective_at, rescinded_at, created_at, updated_at)
  values (
    case when coalesce(p_row->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (p_row->>'id')::uuid else gen_random_uuid() end,
    p_row->>'ref',
    coalesce(p_row->>'kind', 'instruction'),
    coalesce(p_row->>'issued_by_charter_id', 'platform'),
    p_row->>'issued_by_name',
    coalesce(p_row->>'title', p_row->>'ref'),
    p_row->>'citation',
    coalesce(p_row->>'status', 'drafting'),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_row->'targets', '[]'::jsonb))), '{}'),
    coalesce(p_row->'payload', '{}'::jsonb),
    (p_row->>'signed_at')::timestamptz,
    v_signer,
    (p_row->>'effective_at')::timestamptz,
    (p_row->>'rescinded_at')::timestamptz,
    coalesce((p_row->>'created_at')::timestamptz, now()),
    coalesce((p_row->>'updated_at')::timestamptz, now())
  )
  on conflict (ref) do update set
    kind = excluded.kind,
    issued_by_charter_id = excluded.issued_by_charter_id,
    issued_by_name = excluded.issued_by_name,
    title = excluded.title,
    citation = excluded.citation,
    status = excluded.status,
    targets = excluded.targets,
    payload = excluded.payload,
    signed_at = excluded.signed_at,
    signed_by_id = coalesce(excluded.signed_by_id, civicos.directives.signed_by_id),
    effective_at = excluded.effective_at,
    rescinded_at = excluded.rescinded_at
  returning * into rec;
  return rec;
end $fn$;

create or replace function public.civicos_mirror_directive(p_row jsonb)
returns civicos.directives language sql security definer set search_path = public, pg_catalog
as $fn$ select civicos.mirror_directive(p_row); $fn$;

revoke all on function civicos.mirror_directive(jsonb) from public, anon, authenticated;
revoke all on function public.civicos_mirror_directive(jsonb) from public, anon, authenticated;
grant execute on function civicos.mirror_directive(jsonb) to service_role;
grant execute on function public.civicos_mirror_directive(jsonb) to service_role;

-- ── Institutions ────────────────────────────────────────────────────────────

create or replace function civicos.mirror_institution(
  p_charter_id text, p_label text, p_kind text, p_domain text,
  p_archetype_or_branch text, p_activated boolean, p_meta jsonb default '{}'::jsonb
) returns civicos.institutions
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.institutions;
begin
  if coalesce(p_charter_id, '') = '' then raise exception 'charter_id required'; end if;
  insert into civicos.institutions
    (charter_id, label, kind, domain, archetype_or_branch, activated, activated_at, meta)
  values (p_charter_id, p_label, p_kind::civicos.institution_kind, p_domain, p_archetype_or_branch,
          coalesce(p_activated, false), case when p_activated then now() end, coalesce(p_meta, '{}'::jsonb))
  on conflict (charter_id) do update set
    label = excluded.label, kind = excluded.kind, domain = excluded.domain,
    archetype_or_branch = excluded.archetype_or_branch,
    activated = excluded.activated,
    activated_at = case when excluded.activated then coalesce(civicos.institutions.activated_at, now()) else civicos.institutions.activated_at end,
    -- Columns the substrate keeps for itself (grammar, domains shipped, its
    -- own meta keys) stay; the registry's keys are merged over them.
    meta = civicos.institutions.meta || coalesce(excluded.meta, '{}'::jsonb)
  returning * into rec;
  return rec;
end $fn$;

create or replace function public.civicos_mirror_institution(
  p_charter_id text, p_label text, p_kind text, p_domain text,
  p_archetype_or_branch text, p_activated boolean, p_meta jsonb default '{}'::jsonb
) returns civicos.institutions language sql security definer set search_path = public, pg_catalog
as $fn$ select civicos.mirror_institution(p_charter_id, p_label, p_kind, p_domain, p_archetype_or_branch, p_activated, p_meta); $fn$;

revoke all on function civicos.mirror_institution(text,text,text,text,text,boolean,jsonb) from public, anon, authenticated;
revoke all on function public.civicos_mirror_institution(text,text,text,text,text,boolean,jsonb) from public, anon, authenticated;
grant execute on function civicos.mirror_institution(text,text,text,text,text,boolean,jsonb) to service_role;
grant execute on function public.civicos_mirror_institution(text,text,text,text,text,boolean,jsonb) to service_role;

-- ── The old write RPCs: no longer callable from a browser ─────────────────────

revoke execute on function civicos.record_directive(text,text,text,text,text,text[],jsonb,text,text) from anon, authenticated;
revoke execute on function public.civicos_record_directive(text,text,text,text,text,text[],jsonb,text,text) from anon, authenticated;
revoke execute on function civicos.sign_directive(text,uuid,timestamptz) from anon, authenticated;
revoke execute on function public.civicos_sign_directive(text,uuid,timestamptz) from anon, authenticated;
revoke execute on function civicos.rescind_directive(text) from anon, authenticated;
revoke execute on function public.civicos_rescind_directive(text) from anon, authenticated;
revoke execute on function civicos.register_institution(text,text,civicos.institution_kind,text,text,text,text,int,int,jsonb) from anon, authenticated;
revoke execute on function public.civicos_register_institution(text,text,text,text,text,text,text,int,int,jsonb) from anon, authenticated;
revoke execute on function civicos.activate_institution(text) from anon, authenticated;
revoke execute on function public.civicos_activate_institution(text) from anon, authenticated;

comment on table civicos.directives is 'Mirror of the platform''s directives register (lib/data/directives.ts, /api/directives); written only by mirror_directive from the platform (app/src/lib/db/mirror.ts).';
comment on table civicos.institutions is 'Mirror of the platform''s ministry registry (/api/org/ministries) and the standing branches and agencies; written only by mirror_institution from the platform (app/src/lib/db/mirror.ts) and the seed migration.';
