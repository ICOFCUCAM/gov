-- 20260521130000_civicos_actor_steps_view.sql
--
-- Joined view of all work_item_steps with parent work_item context.
-- The signed_steps view only surfaces signed actions; this one carries
-- everything so an officer's complete activity timeline is one query.
-- RLS on the underlying tables still scopes what each session sees.

drop view if exists public.civicos_actor_steps;
create view public.civicos_actor_steps with (security_invoker = true) as
  select s.id, s.work_item_id, s.seq, s.from_stage, s.to_stage, s.action,
         s.actor_id, s.actor_name, s.actor_role,
         s.requires_signature, s.signature_hash, s.signed_at,
         s.audit_tag, s.detail, s.at,
         w.ref as work_item_ref, w.scope as work_item_scope,
         w.workflow_id, w.kind, w.originating_charter_id, w.title as work_item_title
    from civicos.work_item_steps s
    join civicos.work_items w on w.id = s.work_item_id;

grant select on public.civicos_actor_steps to anon, authenticated;
