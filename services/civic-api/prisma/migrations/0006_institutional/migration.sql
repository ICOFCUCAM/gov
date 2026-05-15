-- Institutional framework: dynamic multi-ministry composition.

CREATE TYPE "MinistryArchetype" AS ENUM (
  'HEALTH','EDUCATION','FINANCE','AGRICULTURE','ENERGY','TRANSPORT',
  'JUSTICE','ENVIRONMENT','INTERIOR','LABOR','TRADE','GENERIC');
CREATE TYPE "MinistryStatus" AS ENUM ('ACTIVE','MERGED','DEACTIVATED');

CREATE TABLE "Ministry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "archetype" "MinistryArchetype" NOT NULL,
  "status" "MinistryStatus" NOT NULL DEFAULT 'ACTIVE',
  "mergedIntoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ministry_tenantId_slug_key" ON "Ministry"("tenantId","slug");
CREATE INDEX "Ministry_tenantId_status_idx" ON "Ministry"("tenantId","status");
ALTER TABLE "Ministry" ADD CONSTRAINT "Ministry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "ministryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_ministryId_name_key" ON "Department"("ministryId","name");
ALTER TABLE "Department" ADD CONSTRAINT "Department_ministryId_fkey"
  FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ModuleActivation" (
  "id" TEXT NOT NULL,
  "ministryId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "ModuleActivation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModuleActivation_ministryId_moduleKey_key" ON "ModuleActivation"("ministryId","moduleKey");
CREATE INDEX "ModuleActivation_ministryId_enabled_idx" ON "ModuleActivation"("ministryId","enabled");
ALTER TABLE "ModuleActivation" ADD CONSTRAINT "ModuleActivation_ministryId_fkey"
  FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS parity for the tenant-scoped institutional root.
ALTER TABLE "Ministry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Ministry" USING ("tenantId" = civic_current_tenant());
