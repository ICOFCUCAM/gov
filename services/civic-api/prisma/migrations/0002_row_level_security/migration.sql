-- CivicOS — defence-in-depth tenant isolation via Postgres Row-Level Security.
-- The application already scopes every query by tenantId (TenantContext);
-- RLS is the second wall: even a query that forgets the WHERE clause, or a
-- compromised connection, cannot read across tenants.
--
-- The app connects with role `civic_app` and sets `app.tenant_id` per
-- request (SET LOCAL app.tenant_id = '<id>'). Policies below restrict rows
-- to the active tenant. Append-only tables additionally deny UPDATE/DELETE.

-- Application role (least privilege; no superuser, no DDL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'civic_app') THEN
    CREATE ROLE civic_app NOLOGIN;
  END IF;
END$$;

-- Helper: current tenant from session GUC.
CREATE OR REPLACE FUNCTION civic_current_tenant() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.tenant_id', true)
$$;

-- Enable RLS + policy on tenant-scoped tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','RoleBinding','Citizen','Permit','Bill','Receipt',
    'DocumentRef','AuditEvent','OutboxEvent'
  ] LOOP
    EXECUTE format('ALTER TABLE "%s" ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON "%s" USING ("tenantId" = civic_current_tenant());',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_write ON "%s" FOR INSERT WITH CHECK ("tenantId" = civic_current_tenant());',
      t
    );
  END LOOP;
END$$;

-- Append-only enforcement: receipts and audit events cannot be mutated.
CREATE RULE receipt_no_update AS ON UPDATE TO "Receipt" DO INSTEAD NOTHING;
CREATE RULE receipt_no_delete AS ON DELETE TO "Receipt" DO INSTEAD NOTHING;
CREATE RULE audit_no_update   AS ON UPDATE TO "AuditEvent" DO INSTEAD NOTHING;
CREATE RULE audit_no_delete   AS ON DELETE TO "AuditEvent" DO INSTEAD NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO civic_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO civic_app;
