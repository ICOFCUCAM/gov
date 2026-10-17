-- Nation-neutral billing: a bill's currency is the installed nation's
-- (ISO 4217), supplied explicitly on creation, never a default tied to one
-- country (previously 'KES'). Existing rows keep their recorded currency.
ALTER TABLE "Bill" ALTER COLUMN "currency" DROP DEFAULT;
