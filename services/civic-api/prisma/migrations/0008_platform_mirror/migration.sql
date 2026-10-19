-- civic-api becomes a mirror of the CivicOS platform (architecture review D8).
-- The platform owns every register; these tables are written only by the
-- mirror follower (src/mirror/follower.ts). Nothing is dropped.

-- The platform's permits name the applicant and municipality, and its bills
-- name no citizen: mirrored rows carry no citizen. Earlier rows keep theirs.
ALTER TABLE "Permit" ALTER COLUMN "citizenId" DROP NOT NULL;
ALTER TABLE "Permit" ADD COLUMN "applicantName" TEXT;
ALTER TABLE "Permit" ADD COLUMN "municipality" TEXT;
ALTER TABLE "Bill" ALTER COLUMN "citizenId" DROP NOT NULL;
-- An optional citizen, as Prisma keeps optional relations.
ALTER TABLE "Permit" DROP CONSTRAINT "Permit_citizenId_fkey";
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_citizenId_fkey";
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The follower's bookkeeping: the audit sequence the mirror is current to,
-- and the platform events already applied.
CREATE TABLE "MirrorState" (
    "id" TEXT NOT NULL,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "registerSeqs" JSONB NOT NULL DEFAULT '{}',
    "lastEventAt" TIMESTAMP(3),
    "lastFullSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirrorState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MirrorAppliedEvent" (
    "eventId" TEXT NOT NULL,
    "auditSeq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorAppliedEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "MirrorAppliedEvent_auditSeq_idx" ON "MirrorAppliedEvent"("auditSeq");

GRANT SELECT, INSERT, UPDATE, DELETE ON "MirrorState", "MirrorAppliedEvent" TO civic_app;
