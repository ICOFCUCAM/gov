-- case_mirror_test.sql — the substrate keeps each case's progress as a mirror
-- of the platform's case register (migration 20261025000000_civicos_case_mirror.sql).
-- Run as the owner / service role connection (supabase/tests/run.sh).
-- Self-contained: begin … rollback.
begin;

do $$
declare c civicos.case_mirror;
begin
  c := civicos.mirror_case(jsonb_build_object(
    'id', '0b0e4a8c-2222-4333-8444-555566667777', 'ref', 'DRA-2026-000001', 'procedure_key', 'civil.death', 'procedure_version', 2,
    'owner_institution', 'interior', 'stage', 'submitted', 'priority', 'routine', 'sensitivity', 'restricted',
    'pending_approval', false, 'next_due', '2026-11-01T00:00:00Z', 'source', 'entered', 'opened_at', '2026-10-02T09:00:00Z'));
  if c.stage <> 'submitted' or c.next_due <> '2026-11-01T00:00:00Z'::timestamptz or c.closed_at is not null then
    raise exception 'mirror_case did not copy the case: %', row_to_json(c);
  end if;
  -- A later step replaces the progress.
  c := civicos.mirror_case(jsonb_build_object(
    'id', '0b0e4a8c-2222-4333-8444-555566667777', 'ref', 'DRA-2026-000001', 'procedure_key', 'civil.death', 'procedure_version', 2,
    'owner_institution', 'interior', 'stage', 'registered', 'priority', 'routine', 'sensitivity', 'restricted',
    'pending_approval', false, 'source', 'entered', 'opened_at', '2026-10-02T09:00:00Z', 'closed_at', '2026-10-05T12:00:00Z'));
  if c.stage <> 'registered' or c.closed_at is null or c.next_due is not null then
    raise exception 'mirror_case did not update the copy: %', row_to_json(c);
  end if;
  -- Only the service role writes it.
  if has_function_privilege('anon', 'public.civicos_mirror_case(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.civicos_mirror_case(jsonb)', 'execute') then
    raise exception 'browser roles can write the case mirror';
  end if;
end $$;

rollback;
