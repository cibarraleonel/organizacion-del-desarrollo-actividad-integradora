-- Modify "users" table
ALTER TABLE "public"."users" ALTER COLUMN "updated_at" TYPE timestamptz, ALTER COLUMN "updated_at" DROP NOT NULL, ALTER COLUMN "last_access_time" TYPE timestamptz;
