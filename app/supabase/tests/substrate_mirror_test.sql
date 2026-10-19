-- substrate_mirror_test.sql — the substrate's directives and institutions are
-- mirrors of the platform's registers (architecture review D8; migration
-- 20261022000000_civicos_substrate_mirror.sql). Run as the owner / service
-- role connection (supabase/tests/run.sh). Self-contained: begin … rollback.
begin;

do $$
declare d civicos.directives; i civicos.institutions; denied boolean;
begin
  -- The mirror copies the platform's record as it stands: status and times included.
  d := civicos.mirror_directive(jsonb_build_object(
    'id', '0b0e4a8c-1111-4222-8333-444455556666', 'ref', 'DIR-MIRROR-T1', 'kind', 'policy',
    'issued_by_charter_id', 'presidency', 'issued_by_name', 'A. Official', 'title', 'Mirrored',
    'status', 'effective', 'targets', jsonb_build_array('ministry-health'), 'payload', '{}'::jsonb,
    'signed_at', '2026-05-01T10:00:00Z', 'signed_by_id', 'A. Signer', 'effective_at', '2026-05-01T10:00:00Z',
    'created_at', '2026-04-30T09:00:00Z', 'updated_at', '2026-05-01T10:00:00Z'));
  if d.id <> '0b0e4a8c-1111-4222-8333-444455556666' or d.status <> 'effective' or d.signed_by_id is not null
     or d.signed_at <> '2026-05-01T10:00:00Z'::timestamptz or d.targets <> array['ministry-health'] then
    raise exception 'mirror_directive did not copy the record: %', row_to_json(d);
  end if;
  -- A later change replaces the copy (withdrawal), whatever was there.
  d := civicos.mirror_directive(jsonb_build_object('ref', 'DIR-MIRROR-T1', 'kind', 'policy', 'issued_by_charter_id', 'presidency',
    'title', 'Mirrored', 'status', 'rescinded', 'rescinded_at', '2026-05-02T08:00:00Z', 'signed_at', '2026-05-01T10:00:00Z'));
  if d.status <> 'rescinded' or d.rescinded_at is null or d.id <> '0b0e4a8c-1111-4222-8333-444455556666' then
    raise exception 'mirror_directive did not update the copy: %', row_to_json(d);
  end if;

  -- Institutions: the registry's activation is copied both ways; the substrate's own columns stay.
  update civicos.institutions set grammar = 'kept' where charter_id = 'presidency';
  i := civicos.mirror_institution('presidency', 'Presidency (renamed)', 'branch', 'presidency', 'GENERIC', false, '{"source":"platform"}'::jsonb);
  if i.activated or i.label <> 'Presidency (renamed)' or i.grammar <> 'kept' or i.meta->>'source' <> 'platform' then
    raise exception 'mirror_institution did not copy the registry row: %', row_to_json(i);
  end if;
  i := civicos.mirror_institution('presidency', 'Presidency', 'branch', 'presidency', 'GENERIC', true, '{}'::jsonb);
  if not i.activated or i.activated_at is null then raise exception 'mirror_institution did not activate: %', row_to_json(i); end if;

  -- The browser roles can no longer write either table.
  foreach denied in array array[
    has_function_privilege('anon', 'public.civicos_record_directive(text,text,text,text,text,text[],jsonb,text,text)', 'execute'),
    has_function_privilege('authenticated', 'public.civicos_sign_directive(text,uuid,timestamptz)', 'execute'),
    has_function_privilege('authenticated', 'public.civicos_rescind_directive(text)', 'execute'),
    has_function_privilege('anon', 'public.civicos_register_institution(text,text,text,text,text,text,text,int,int,jsonb)', 'execute'),
    has_function_privilege('authenticated', 'public.civicos_activate_institution(text)', 'execute'),
    has_function_privilege('anon', 'public.civicos_mirror_directive(jsonb)', 'execute'),
    has_function_privilege('authenticated', 'public.civicos_mirror_institution(text,text,text,text,text,boolean,jsonb)', 'execute')
  ] loop
    if denied then raise exception 'a browser role can still write a mirrored table'; end if;
  end loop;
  if not has_function_privilege('service_role', 'public.civicos_mirror_directive(jsonb)', 'execute')
     or not has_function_privilege('service_role', 'public.civicos_mirror_institution(text,text,text,text,text,boolean,jsonb)', 'execute') then
    raise exception 'the service role cannot write the mirror';
  end if;
end $$;

rollback;
