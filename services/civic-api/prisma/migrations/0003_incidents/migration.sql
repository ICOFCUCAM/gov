-- Operational incidents (operational intelligence layer).

CREATE TYPE "IncidentSeverity" AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "owner" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "events" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Incident_tenantId_status_idx" ON "Incident"("tenantId", "status");
CREATE INDEX "Incident_tenantId_severity_idx" ON "Incident"("tenantId", "severity");

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS parity with migration 0002 (defence in depth).
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Incident"
  USING ("tenantId" = civic_current_tenant());
CREATE POLICY tenant_isolation_write ON "Incident"
  FOR INSERT WITH CHECK ("tenantId" = civic_current_tenant());
