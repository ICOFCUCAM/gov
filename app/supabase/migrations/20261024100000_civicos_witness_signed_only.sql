-- 20261024100000_civicos_witness_signed_only.sql
--
-- Go-live review H-1: anyone with the public (anon) key could overwrite a
-- witness attestation (the RPC upserted on (scope, seq, label)) and plant a
-- wrong hash that the divergence watchdog turned into a "major" escalation.
-- Signatures were stored but never checked.
--
-- From here on:
--   1. Witness keys are registered (civicos.audit_witness_keys): a public key
--      per witness label, added and revoked only by the platform (service
--      role), which does so for an administrator (/api/audit/witnesses/keys).
--   2. record_witness_attestation is service-role only. The platform route
--      (/api/audit/witnesses) verifies the signature over
--      `scope|seq|hash|label` against the registered key before it calls it;
--      the RPC itself refuses a row without a signature of the right shape or
--      whose key is not a registered, unrevoked key of that label. ECDSA and
--      Ed25519 cannot be verified in plain SQL, so the check of the signature
--      bytes is the platform's; the SQL side guarantees nobody but the
--      platform can write, and only for registered keys.
--   3. Attestations are insert-only: a second statement for the same
--      (scope, seq, label) is refused, and a trigger refuses UPDATE and
--      DELETE on the table for every role.
--   4. Rows recorded with a registered key carry key_id. The public view adds
--      `registered_key`; the watchdog reads public.civicos_signed_witnesses
--      (rows with a key, with the key's public JWK) and re-verifies each
--      signature before it trusts it. Older unsigned rows stay readable as
--      history and never raise an alarm.
--
-- Relies on is_service_context() as corrected in 20261024090000.

set search_path = civicos, pg_catalog;

-- ── Registered witness keys ──
create table if not exists civicos.audit_witness_keys (
  id             uuid primary key default gen_random_uuid(),
  witness_label  text not null check (length(witness_label) between 1 and 200),
  public_jwk     jsonb not null,
  -- kty|crv|x|y, the identity of the key (the JWK may carry extra members).
  key_fingerprint text not null,
  registered_by  text not null,
  registered_at  timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_by     text,
  unique (witness_label, key_fingerprint)
);

alter table civicos.audit_witness_keys enable row level security;
-- Public keys are public: anyone may check which keys count as witnesses.
create policy audit_witness_keys_read on civicos.audit_witness_keys
  for select to anon, authenticated using (true);
grant select on civicos.audit_witness_keys to anon, authenticated;

create or replace function civicos.witness_key_fingerprint(p_jwk jsonb)
returns text
language plpgsql immutable
set search_path = civicos, pg_catalog
as $$
begin
  if p_jwk is null or jsonb_typeof(p_jwk) <> 'object' then return null; end if;
  if p_jwk->>'kty' = 'EC' and p_jwk->>'crv' = 'P-256'
     and coalesce(p_jwk->>'x', '') <> '' and coalesce(p_jwk->>'y', '') <> '' then
    return 'EC|P-256|' || (p_jwk->>'x') || '|' || (p_jwk->>'y');
  end if;
  if p_jwk->>'kty' = 'OKP' and p_jwk->>'crv' = 'Ed25519' and coalesce(p_jwk->>'x', '') <> '' then
    return 'OKP|Ed25519|' || (p_jwk->>'x');
  end if;
  return null;  -- unsupported key type
end$$;

create or replace function civicos.register_witness_key(
  p_witness_label text, p_public_jwk jsonb, p_registered_by text
) returns civicos.audit_witness_keys
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_fp text; v_row civicos.audit_witness_keys;
begin
  if not civicos.is_service_context() then
    raise exception 'register_witness_key requires service_role' using errcode = 'insufficient_privilege';
  end if;
  if p_witness_label is null or length(trim(p_witness_label)) = 0 or length(p_witness_label) > 200 then
    raise exception 'witness label required (at most 200 characters)';
  end if;
  if p_registered_by is null or length(trim(p_registered_by)) = 0 then
    raise exception 'registered_by required';
  end if;
  v_fp := civicos.witness_key_fingerprint(p_public_jwk);
  if v_fp is null then
    raise exception 'public key must be an EC P-256 or Ed25519 JWK';
  end if;
  if p_public_jwk ? 'd' then
    raise exception 'that is a private key; register the public half only';
  end if;
  insert into civicos.audit_witness_keys (witness_label, public_jwk, key_fingerprint, registered_by)
  values (trim(p_witness_label), p_public_jwk, v_fp, trim(p_registered_by))
  on conflict (witness_label, key_fingerprint) do update
    set revoked_at = null, revoked_by = null   -- re-registering a revoked key reinstates it
    where civicos.audit_witness_keys.revoked_at is not null
  returning * into v_row;
  if v_row.id is null then
    select * into v_row from civicos.audit_witness_keys
    where witness_label = trim(p_witness_label) and key_fingerprint = v_fp;
  end if;
  perform civicos.append_audit('substrate:witnesses', trim(p_registered_by), 'witness_key_register',
    v_row.id::text, trim(p_witness_label) || ' ' || v_fp);
  return v_row;
end$$;

create or replace function civicos.revoke_witness_key(p_id uuid, p_revoked_by text)
returns boolean
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not civicos.is_service_context() then
    raise exception 'revoke_witness_key requires service_role' using errcode = 'insufficient_privilege';
  end if;
  if p_revoked_by is null or length(trim(p_revoked_by)) = 0 then
    raise exception 'revoked_by required';
  end if;
  update civicos.audit_witness_keys set revoked_at = now(), revoked_by = trim(p_revoked_by)
  where id = p_id and revoked_at is null
  returning true into v_found;
  if coalesce(v_found, false) then
    perform civicos.append_audit('substrate:witnesses', trim(p_revoked_by), 'witness_key_revoke', p_id::text, 'revoked');
  end if;
  return coalesce(v_found, false);
end$$;

-- ── Attestations: key reference and insert-only ──
alter table civicos.audit_witnesses add column if not exists key_id uuid references civicos.audit_witness_keys(id);

create or replace function civicos.audit_witnesses_insert_only()
returns trigger
language plpgsql
set search_path = civicos, pg_catalog
as $$
begin
  raise exception 'witness attestations are insert-only (% refused)', tg_op
    using errcode = 'insufficient_privilege';
end$$;

drop trigger if exists audit_witnesses_insert_only on civicos.audit_witnesses;
create trigger audit_witnesses_insert_only
  before update or delete on civicos.audit_witnesses
  for each row execute function civicos.audit_witnesses_insert_only();

-- Same signature as before so the public wrapper keeps its name and shape.
create or replace function civicos.record_witness_attestation(
  p_scope             text,
  p_observed_seq      bigint,
  p_observed_hash     text,
  p_witness_label     text,
  p_witness_jwk       jsonb default null,
  p_witness_signature text default null
) returns civicos.audit_witnesses
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_row civicos.audit_witnesses;
  v_key civicos.audit_witness_keys;
  v_fp  text;
begin
  if not civicos.is_service_context() then
    raise exception 'record_witness_attestation requires service_role (submit through /api/audit/witnesses)'
      using errcode = 'insufficient_privilege';
  end if;
  if p_scope is null or length(p_scope) = 0 or length(p_scope) > 200
     or p_observed_seq is null or p_observed_seq < 0
     or p_observed_hash is null or length(p_observed_hash) = 0 or length(p_observed_hash) > 200
     or p_witness_label is null or length(p_witness_label) = 0 or length(p_witness_label) > 200 then
    raise exception 'invalid arguments';
  end if;
  -- A raw ECDSA P-256 (r||s) or Ed25519 signature: 64 bytes, lowercase hex.
  if p_witness_signature is null or p_witness_signature !~ '^[0-9a-f]{128}$' then
    raise exception 'a signature (128 lowercase hex characters) is required';
  end if;
  v_fp := civicos.witness_key_fingerprint(p_witness_jwk);
  select * into v_key from civicos.audit_witness_keys
  where witness_label = p_witness_label and key_fingerprint = v_fp and revoked_at is null;
  if v_key.id is null then
    raise exception 'no registered witness key for label % matches the key given', p_witness_label
      using errcode = 'insufficient_privilege';
  end if;

  -- Insert-only: the unique (scope, observed_seq, witness_label) refuses a second statement.
  begin
    insert into civicos.audit_witnesses
      (scope, observed_seq, observed_hash, witness_label, witness_jwk,
       witness_signature, recorded_by, key_id)
    values
      (p_scope, p_observed_seq, p_observed_hash, p_witness_label, v_key.public_jwk,
       p_witness_signature, p_witness_label, v_key.id)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'witness % already attested %@%; attestations are never replaced',
      p_witness_label, p_scope, p_observed_seq using errcode = 'unique_violation';
  end;

  perform civicos.append_audit(
    'substrate:witnesses', p_witness_label, 'witness_attest',
    p_scope || '@' || p_observed_seq,
    p_observed_hash || ' (label=' || p_witness_label || ', key=' || v_key.id || ')'
  );
  return v_row;
end$$;

-- Public wrapper: the platform only.
revoke execute on function public.civicos_record_witness_attestation(text, bigint, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.civicos_record_witness_attestation(text, bigint, text, text, jsonb, text)
  to service_role;
revoke execute on function civicos.record_witness_attestation(text, bigint, text, text, jsonb, text)
  from public, anon, authenticated;

create or replace function public.civicos_register_witness_key(
  p_witness_label text, p_public_jwk jsonb, p_registered_by text
) returns civicos.audit_witness_keys
language sql security definer set search_path = public, pg_catalog
as $$ select civicos.register_witness_key(p_witness_label, p_public_jwk, p_registered_by); $$;

create or replace function public.civicos_revoke_witness_key(p_id uuid, p_revoked_by text)
returns boolean
language sql security definer set search_path = public, pg_catalog
as $$ select civicos.revoke_witness_key(p_id, p_revoked_by); $$;

revoke execute on function public.civicos_register_witness_key(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.civicos_revoke_witness_key(uuid, text)         from public, anon, authenticated;
revoke execute on function civicos.register_witness_key(text, jsonb, text)        from public, anon, authenticated;
revoke execute on function civicos.revoke_witness_key(uuid, text)                 from public, anon, authenticated;
grant  execute on function public.civicos_register_witness_key(text, jsonb, text) to service_role;
grant  execute on function public.civicos_revoke_witness_key(uuid, text)         to service_role;

-- ── Public surface ──
-- The existing view gains `registered_key` (appended; columns keep their order).
create or replace view public.civicos_audit_witnesses
  with (security_invoker = true) as
select id, scope, observed_seq, observed_hash, witness_label,
       witness_jwk is not null as has_jwk,
       witness_signature is not null as has_signature,
       at, recorded_by,
       key_id is not null as registered_key
from civicos.audit_witnesses;
grant select on public.civicos_audit_witnesses to anon, authenticated;

-- Rows recorded with a registered key, with that key, for re-verification.
create or replace view public.civicos_signed_witnesses
  with (security_invoker = true) as
select w.id, w.scope, w.observed_seq, w.observed_hash, w.witness_label,
       w.witness_signature, w.at, w.key_id,
       k.public_jwk, k.revoked_at as key_revoked_at
from civicos.audit_witnesses w
join civicos.audit_witness_keys k on k.id = w.key_id;
grant select on public.civicos_signed_witnesses to anon, authenticated, service_role;

create or replace view public.civicos_audit_witness_keys
  with (security_invoker = true) as
select id, witness_label, public_jwk, registered_by, registered_at, revoked_at, revoked_by
from civicos.audit_witness_keys;
grant select on public.civicos_audit_witness_keys to anon, authenticated, service_role;
