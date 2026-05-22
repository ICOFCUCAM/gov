-- 20260521850000_civicos_federation_edges.sql
--
-- Phase C · the cross-ministry dependency graph as queryable substrate.
--
-- The interconnection graph that drives cascade visualisation lived only in
-- TypeScript config (lib/institution/ministry-fabric.ts::DEPS) — pure data,
-- never reachable from SQL, so nothing in the substrate could propagate along
-- it. This persists it as civicos.federation_edges (archetype-level, matching
-- institutions.archetype_or_branch) so triggers/RPCs can resolve a charter's
-- real dependents. Seed mirrors the declared graph exactly.
--
-- Edges are declared topology (no operational/PII content) → anon-readable
-- via a SECURITY DEFINER wrapper; the table itself stays RLS-locked.

set search_path = civicos, pg_catalog;

create table if not exists civicos.federation_edges (
  id uuid primary key default gen_random_uuid(),
  source_archetype text not null,
  target_archetype text not null,
  relation text not null,
  direction text not null check (direction in ('provides', 'consumes', 'mutual')),
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (source_archetype, target_archetype, relation)
);

alter table civicos.federation_edges enable row level security;

insert into civicos.federation_edges (source_archetype, target_archetype, relation, direction) values
  ('HEALTH','FINANCE','Budget & insurance settlement','consumes'),
  ('HEALTH','TRANSPORT','Ambulance corridors · supply chain','mutual'),
  ('HEALTH','INTERIOR','Civil registry · identity','consumes'),
  ('HEALTH','TRADE','Pharmaceutical imports','consumes'),
  ('HEALTH','GENERIC','Emergency response coordination','provides'),
  ('ENERGY','FINANCE','Tariff & subsidy settlement','consumes'),
  ('ENERGY','TRANSPORT','Fuel logistics corridors','mutual'),
  ('ENERGY','INTERIOR','Critical-infrastructure security','consumes'),
  ('ENERGY','HEALTH','Facility power continuity','provides'),
  ('TRANSPORT','HEALTH','Medical supply & evacuation','provides'),
  ('TRANSPORT','TRADE','Export/import corridors','mutual'),
  ('TRANSPORT','INTERIOR','Border & checkpoint coordination','mutual'),
  ('TRANSPORT','ENERGY','Fuel distribution','consumes'),
  ('FINANCE','GENERIC','Whole-of-government appropriation','provides'),
  ('FINANCE','TRADE','Revenue & customs','mutual'),
  ('FINANCE','INTERIOR','Identity-linked taxation','consumes'),
  ('INTERIOR','GENERIC','Identity & civil registry backbone','provides'),
  ('INTERIOR','TRANSPORT','Border control','mutual'),
  ('INTERIOR','FINANCE','Sanctions & enforcement','mutual'),
  ('AGRICULTURE','TRADE','Commodity markets & exports','mutual'),
  ('AGRICULTURE','TRANSPORT','Produce logistics','consumes'),
  ('AGRICULTURE','ENVIRONMENT','Irrigation & climate data','consumes'),
  ('ENVIRONMENT','AGRICULTURE','Climate & water advisory','provides'),
  ('ENVIRONMENT','ENERGY','Emissions oversight','mutual'),
  ('TRADE','FINANCE','Customs revenue','provides'),
  ('TRADE','TRANSPORT','Trade corridors','mutual'),
  ('JUSTICE','INTERIOR','Corrections & enforcement','mutual'),
  ('JUSTICE','FINANCE','Asset recovery','provides'),
  ('LABOR','FINANCE','Social-insurance funds','mutual'),
  ('LABOR','EDUCATION','Skills & training pipeline','consumes'),
  ('EDUCATION','FINANCE','Scholarship & capitation funding','consumes'),
  ('EDUCATION','INTERIOR','Learner identity','consumes')
on conflict (source_archetype, target_archetype, relation) do nothing;

-- Read surface: declared topology, optionally scoped to one source archetype.
create or replace function civicos.list_federation_edges(p_source_archetype text default null)
returns table(source_archetype text, target_archetype text, relation text, direction text, weight numeric)
language sql security definer stable
set search_path = civicos, pg_catalog
as $$
  select source_archetype, target_archetype, relation, direction, weight
  from civicos.federation_edges
  where p_source_archetype is null or source_archetype = p_source_archetype
  order by source_archetype, target_archetype;
$$;

create or replace function public.civicos_list_federation_edges(p_source_archetype text default null)
returns table(source_archetype text, target_archetype text, relation text, direction text, weight numeric)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.list_federation_edges(p_source_archetype); $$;

revoke execute on function public.civicos_list_federation_edges(text) from public;
grant  execute on function public.civicos_list_federation_edges(text) to anon, authenticated;
