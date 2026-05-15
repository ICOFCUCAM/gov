-- Interoperability & federation layer.

CREATE TYPE "IntegrationKind"   AS ENUM ('INTEGRATION', 'EXTENSION');
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED');
CREATE TYPE "FederationStatus"  AS ENUM ('PROPOSED', 'APPROVED', 'REVOKED');
CREATE TYPE "WebhookStatus"     AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

CREATE TABLE "IntegrationClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "name" TEXT NOT NULL,
    "ownerOrg" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "rateLimitRpm" INTEGER NOT NULL DEFAULT 120,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "IntegrationClient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationClient_tenantId_name_key" ON "IntegrationClient"("tenantId", "name");
CREATE INDEX "IntegrationClient_keyHash_idx" ON "IntegrationClient"("keyHash");
CREATE INDEX "IntegrationClient_tenantId_status_idx" ON "IntegrationClient"("tenantId", "status");
ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FederationGrant" (
    "id" TEXT NOT NULL,
    "fromTenantId" TEXT NOT NULL,
    "toTenantId" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "FederationStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "FederationGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FederationGrant_fromTenantId_toTenantId_key" ON "FederationGrant"("fromTenantId", "toTenantId");
CREATE INDEX "FederationGrant_toTenantId_status_idx" ON "FederationGrant"("toTenantId", "status");
ALTER TABLE "FederationGrant" ADD CONSTRAINT "FederationGrant_fromTenantId_fkey"
  FOREIGN KEY ("fromTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FederationGrant" ADD CONSTRAINT "FederationGrant_toTenantId_fkey"
  FOREIGN KEY ("toTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookSubscription_tenantId_status_idx" ON "WebhookSubscription"("tenantId", "status");
CREATE INDEX "WebhookSubscription_topic_idx" ON "WebhookSubscription"("topic");
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS parity (defence in depth, mirrors migration 0002).
ALTER TABLE "IntegrationClient"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookSubscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "IntegrationClient"   USING ("tenantId" = civic_current_tenant());
CREATE POLICY tenant_isolation ON "WebhookSubscription" USING ("tenantId" = civic_current_tenant());
-- FederationGrant is intentionally visible to both sides; access checks are
-- enforced in FederationService (status + scope + expiry), not by RLS.
