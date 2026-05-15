-- Platform operations & lifecycle.

CREATE TYPE "ReleaseChannel" AS ENUM ('DEV', 'STAGING', 'STABLE');
CREATE TYPE "ReleaseStatus"  AS ENUM ('DRAFT', 'AVAILABLE', 'DEPRECATED');
CREATE TYPE "DeployStrategy" AS ENUM ('ROLLING', 'CANARY', 'BLUE_GREEN');
CREATE TYPE "DeployState"    AS ENUM ('PENDING','PRECHECK','ROLLOUT','VERIFY','COMPLETED','ROLLED_BACK');
CREATE TYPE "BackupKind"     AS ENUM ('FULL', 'INCREMENTAL');
CREATE TYPE "BackupStatus"   AS ENUM ('PENDING','COMPLETED','FAILED','RESTORING');
CREATE TYPE "ConfigScope"    AS ENUM ('GLOBAL', 'TENANT');
CREATE TYPE "ConfigStatus"   AS ENUM ('DRAFT','SIGNED','APPLIED','SUPERSEDED');

CREATE TABLE "Release" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "channel" "ReleaseChannel" NOT NULL DEFAULT 'DEV',
  "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT NOT NULL,
  "schemaMigration" TEXT,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Release_version_channel_key" ON "Release"("version","channel");
CREATE INDEX "Release_channel_status_idx" ON "Release"("channel","status");

CREATE TABLE "Deployment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "strategy" "DeployStrategy" NOT NULL DEFAULT 'ROLLING',
  "state" "DeployState" NOT NULL DEFAULT 'PENDING',
  "gates" JSONB NOT NULL DEFAULT '[]',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deployment_tenantId_state_idx" ON "Deployment"("tenantId","state");
CREATE INDEX "Deployment_releaseId_idx" ON "Deployment"("releaseId");
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BackupRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" "BackupKind" NOT NULL,
  "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
  "location" TEXT NOT NULL,
  "encrypted" BOOLEAN NOT NULL DEFAULT true,
  "sizeBytes" BIGINT,
  "contentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackupRecord_tenantId_status_idx" ON "BackupRecord"("tenantId","status");
CREATE INDEX "BackupRecord_tenantId_createdAt_idx" ON "BackupRecord"("tenantId","createdAt");
ALTER TABLE "BackupRecord" ADD CONSTRAINT "BackupRecord_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ConfigBundle" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "scope" "ConfigScope" NOT NULL,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "signature" TEXT,
  "signedBy" TEXT,
  "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "ConfigBundle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConfigBundle_scope_tenantId_version_key" ON "ConfigBundle"("scope","tenantId","version");
CREATE INDEX "ConfigBundle_status_idx" ON "ConfigBundle"("status");
ALTER TABLE "ConfigBundle" ADD CONSTRAINT "ConfigBundle_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TenantLifecycleEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromState" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLifecycleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenantLifecycleEvent_tenantId_at_idx" ON "TenantLifecycleEvent"("tenantId","at");
ALTER TABLE "TenantLifecycleEvent" ADD CONSTRAINT "TenantLifecycleEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS parity for tenant-scoped operational tables.
ALTER TABLE "Deployment"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BackupRecord"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantLifecycleEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Deployment"           USING ("tenantId" = civic_current_tenant());
CREATE POLICY tenant_isolation ON "BackupRecord"         USING ("tenantId" = civic_current_tenant());
CREATE POLICY tenant_isolation ON "TenantLifecycleEvent" USING ("tenantId" = civic_current_tenant());
