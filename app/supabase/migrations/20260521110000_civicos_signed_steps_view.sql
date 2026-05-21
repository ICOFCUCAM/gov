-- 20260521110000_civicos_signed_steps_view.sql
--
-- Audit-correct view for signature verification: each signed
-- work_item_step joined with the parent work_item so the verifier
-- has the canonical material (actor_id, scope, ref, action, at_ms)
-- it needs without a separate round trip.

drop view if exists public.civicos_signed_steps;
create view public.civicos_signed_steps with (security_invoker = true) as
  select s.id, s.work_item_id, s.seq, s.from_stage, s.to_stage, s.action,
         s.actor_id, s.actor_name, s.actor_role,
         s.requires_signature, s.signature_hash, s.signed_at,
         s.audit_tag, s.detail, s.at,
         w.ref as work_item_ref, w.scope as work_item_scope,
         w.workflow_id, w.kind, w.originating_charter_id
    from civicos.work_item_steps s
    join civicos.work_items w on w.id = s.work_item_id
   where s.signature_hash is not null;

grant select on public.civicos_signed_steps to anon, authenticated;
