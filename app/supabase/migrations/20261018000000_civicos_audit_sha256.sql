-- 20261018000000_civicos_audit_sha256.sql
--
-- The audit chain moves from FNV-1a (32-bit, not collision resistant: a
-- chain could be forged) to SHA-256 over every field of the row, including
-- the time. Rows written before this migration keep their FNV-1a hash and
-- are verified by it (hash_alg = 'fnv1a'); every new row is 'sha256-v2', and
-- once a scope's chain has a v2 row no later row may fall back.
--
-- Canonical text (identical to app/src/lib/audit/replay.ts canonicalV2):
--   'civicos-audit-v2;' then, for prev_hash, seq, scope, actor, action,
--   subject, detail, at_ms: octet_length(field) || ':' || field || ';'
-- Length-prefixing means no separator can be forged inside a field.

set search_path = civicos, pg_catalog;

create extension if not exists pgcrypto with schema extensions;

alter table civicos.audit_entries add column if not exists hash_alg text not null default 'fnv1a'
  check (hash_alg in ('fnv1a', 'sha256-v2'));

create or replace function civicos.audit_canonical_v2(
  p_prev text, p_seq bigint, p_scope text, p_actor text, p_action text, p_subject text, p_detail text, p_at_ms bigint
) returns text language sql immutable
set search_path = pg_catalog
as $fn$
  select 'civicos-audit-v2;' || string_agg(octet_length(f)::text || ':' || f || ';', '' order by i)
  from unnest(array[p_prev, p_seq::text, p_scope, p_actor, p_action, p_subject, coalesce(p_detail, ''), coalesce(p_at_ms::text, '')])
       with ordinality as t(f, i)
$fn$;

create or replace function civicos.audit_hash_v2(p_text text) returns text language sql immutable
set search_path = pg_catalog, extensions
as $fn$ select encode(extensions.digest(convert_to(p_text, 'UTF8'), 'sha256'), 'hex') $fn$;

create or replace function civicos.audit_chain_insert()
returns trigger language plpgsql
set search_path = pg_catalog, civicos
as $fn$
declare prev_h text; next_seq bigint; lock_key bigint;
begin
  lock_key := ('x' || substr(md5(new.scope), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(lock_key);
  select hash, seq + 1 into prev_h, next_seq
    from civicos.audit_entries where scope = new.scope
    order by seq desc limit 1;
  if prev_h is null then prev_h := '00000000'; next_seq := 1; end if;
  new.seq := next_seq;
  new.prev_hash := prev_h;
  new.hash_alg := 'sha256-v2';
  new.hash := civicos.audit_hash_v2(civicos.audit_canonical_v2(
    prev_h, next_seq, new.scope, new.actor, new.action, new.subject, new.detail, new.at_ms));
  return new;
end $fn$;

create or replace function civicos.verify_audit_chain(p_scope text)
returns table (entries bigint, intact boolean, broken_at bigint)
language plpgsql stable
set search_path = pg_catalog, civicos
as $fn$
declare r record; prev_h text := '00000000'; expected text; n bigint := 0; broken bigint := null; upgraded boolean := false;
begin
  for r in select * from civicos.audit_entries where scope = p_scope order by seq asc loop
    n := n + 1;
    if upgraded and r.hash_alg <> 'sha256-v2' then broken := r.seq; exit; end if;
    if r.hash_alg = 'sha256-v2' then
      upgraded := true;
      expected := civicos.audit_hash_v2(civicos.audit_canonical_v2(
        prev_h, r.seq, r.scope, r.actor, r.action, r.subject, r.detail, r.at_ms));
    else
      expected := civicos.fnv1a_hex(
        prev_h || '|' || r.seq::text || '|' || r.scope || '|' || r.actor || '|' ||
        r.action || '|' || r.subject || '|' || coalesce(r.detail, ''));
    end if;
    if r.prev_hash <> prev_h or r.hash <> expected then broken := r.seq; exit; end if;
    prev_h := r.hash;
  end loop;
  return query select n, (broken is null) as intact, broken;
end $fn$;

-- Exports and the auditor's replay need the algorithm of each row.
create or replace view public.civicos_audit_entries with (security_invoker = true) as
  select id, scope, seq, actor, action, subject, detail, at, at_ms, prev_hash, hash, hash_alg from civicos.audit_entries;
