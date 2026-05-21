-- 20260521080000_civicos_signing_keys.sql
--
-- Phase A.5 hardening · officer signing keys.
--
-- Adds the column and contract for production-grade transition
-- signatures. Each officer holds a per-session ECDSA P-256 keypair
-- in browser IndexedDB; the public JWK is uploaded once via
-- register_signing_key. Future audits re-derive the canonical
-- message and verify the signature against the stored JWK — no
-- secret leaves the device.
--
-- This migration provisions storage and contract; the runtime
-- continues to use the FNV-1a tamper digest until the client-side
-- key flow lands.

alter table civicos.officers
  add column if not exists signing_public_key jsonb;
comment on column civicos.officers.signing_public_key is
  'ECDSA P-256 public key in JWK form; uploaded by the officer on first sign-in.';

create or replace function civicos.register_signing_key(p_jwk jsonb)
returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  uid uuid := auth.uid();
  rec civicos.officers;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_jwk is null or jsonb_typeof(p_jwk) <> 'object' then
    raise exception 'jwk must be a JSON object';
  end if;
  if p_jwk->>'kty' is null or p_jwk->>'crv' is null then
    raise exception 'jwk missing kty or crv';
  end if;

  update civicos.officers
     set signing_public_key = p_jwk, updated_at = now()
   where auth_user_id = uid and active
   returning * into rec;
  if rec.id is null then
    raise exception 'no active officer record linked to the current session'
      using errcode = 'no_data_found';
  end if;
  return rec;
end $fn$;

revoke all on function civicos.register_signing_key(jsonb) from public;
grant execute on function civicos.register_signing_key(jsonb) to authenticated;

create or replace function public.civicos_register_signing_key(p_jwk jsonb)
returns civicos.officers language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.register_signing_key(p_jwk); $fn$;
revoke all on function public.civicos_register_signing_key(jsonb) from public;
grant execute on function public.civicos_register_signing_key(jsonb) to authenticated;
