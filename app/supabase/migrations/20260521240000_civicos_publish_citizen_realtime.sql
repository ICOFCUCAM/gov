-- 20260521240000_civicos_publish_citizen_realtime.sql
--
-- Phase B · add the citizen tables to supabase_realtime so the
-- /wallet/receipts surface can re-render without polling. RLS still
-- gates what each subscriber receives — a citizen only sees their own
-- rows; an officer in the target charter sees rows under their scope;
-- platform-tier sees everything. Adding the tables to the publication
-- doesn't widen visibility, only the change-stream.

alter publication supabase_realtime add table civicos.service_requests;
alter publication supabase_realtime add table civicos.consents;
alter publication supabase_realtime add table civicos.appeals;
