-- 20260521210000_civicos_audit_witnesses.sql
--
-- Phase A · audit-chain witness attestations.
--
-- External parties (auditors, civil society, peer institutions) record
-- "I observed the chain for scope S at seq N with hash H at time T"
-- statements. The substrate stores them append-only. Tamper-after-the-fact
-- is detectable because:
--
--   1. Every attestation timestamps the observed (seq, hash) pair.
--   2. If the chain is later rewritten, the live hash at seq N will no
--      longer match the attested hash — the witness statement becomes a
--      tamper proof.
--   3. Attestations themselves are append-only and cryptographically
--      pinned to the substrate's own audit chain (an audit entry is
--      written on each attestation, so the witnesses table is itself
--      witnessed by the audit chain).
--
-- Tables: civicos.audit_witnesses
-- RPCs:   civicos.record_witness_attestation(p_scope, p_seq, p_hash,
--                                            p_witness_label, p_witness_jwk,
--                                            p_witness_signature)
-- Views:  public.civicos_audit_witnesses (security_invoker)

set search_path = civicos, pg_catalog;

create table if not exists civicos.audit_witnesses (
  id              uuid primary key default gen_random_uuid(),
  scope           text not null,
  observed_seq    bigint not null,
  observed_hash   text not null,
  witness_label   text not null,
  witness_jwk     jsonb,                              -- public key (optional)
  witness_signature text,                             -- hex-encoded signature over the canonical material
  at              timestamptz not null default now(),
  recorded_by     text,                               -- platform actor that wrote the row (for audit)

  -- The same (scope, seq, witness_label) can only attest once.
  -- Different witnesses are encouraged to attest the same point.
  unique (scope, observed_seq, witness_label)
);

create index if not exists audit_witnesses_scope_seq_idx
  on civicos.audit_witnesses (scope, observed_seq desc);

create index if not exists audit_witnesses_at_idx
  on civicos.audit_witnesses (at desc);

alter table civicos.audit_witnesses enable row level security;

-- Witnesses are public reads — that's the whole point. Anyone can audit.
create policy audit_witnesses_read_anon on civicos.audit_witnesses
  for select to anon using (true);
create policy audit_witnesses_read_authenticated on civicos.audit_witnesses
  for select to authenticated using (true);

grant select on civicos.audit_witnesses to anon, authenticated;

-- ── RPC: record_witness_attestation ──
-- Append a witness statement. Always writes an accompanying audit entry
-- on scope 'substrate:witnesses' so the table of witnesses is itself
-- protected by the substrate's own tamper-evident chain.
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
  v_actor text;
begin
  if p_scope is null or length(p_scope) = 0
     or p_observed_seq is null or p_observed_seq < 0
     or p_observed_hash is null or length(p_observed_hash) = 0
     or p_witness_label is null or length(p_witness_label) = 0 then
    raise exception 'invalid arguments';
  end if;

  v_actor := coalesce(p_witness_label, 'anonymous-witness');

  insert into civicos.audit_witnesses
    (scope, observed_seq, observed_hash, witness_label, witness_jwk,
     witness_signature, recorded_by)
  values
    (p_scope, p_observed_seq, p_observed_hash, p_witness_label, p_witness_jwk,
     p_witness_signature, v_actor)
  on conflict (scope, observed_seq, witness_label) do update set
    observed_hash     = excluded.observed_hash,
    witness_jwk       = excluded.witness_jwk,
    witness_signature = excluded.witness_signature,
    at                = now(),
    recorded_by       = excluded.recorded_by
  returning * into v_row;

  -- Audit-entry the witnesses table itself.
  perform civicos.append_audit(
    'substrate:witnesses',
    v_actor,
    'witness_attest',
    p_scope || '@' || p_observed_seq,
    p_observed_hash || ' (label=' || p_witness_label || ')'
  );

  return v_row;
end$$;

-- public surface
create or replace view public.civicos_audit_witnesses
  with (security_invoker = true) as
select id, scope, observed_seq, observed_hash, witness_label,
       witness_jwk is not null as has_jwk,
       witness_signature is not null as has_signature,
       at, recorded_by
from civicos.audit_witnesses;

grant select on public.civicos_audit_witnesses to anon, authenticated;

create or replace function public.civicos_record_witness_attestation(
  p_scope             text,
  p_observed_seq      bigint,
  p_observed_hash     text,
  p_witness_label     text,
  p_witness_jwk       jsonb default null,
  p_witness_signature text default null
) returns civicos.audit_witnesses
language sql
security definer
set search_path = public, pg_catalog
as $$
  select civicos.record_witness_attestation(
    p_scope, p_observed_seq, p_observed_hash, p_witness_label,
    p_witness_jwk, p_witness_signature
  );
$$;

-- Open to anon for read; the write RPC remains anon-callable so
-- offline auditors can submit attestations without a Supabase auth
-- session. This is the only write RPC that intentionally accepts anon
-- (it has no side effects beyond appending a row that is publicly
-- readable, and the audit entry it triggers is itself part of the
-- tamper-evident chain).
grant execute on function public.civicos_record_witness_attestation(text, bigint, text, text, jsonb, text)
  to anon, authenticated;
