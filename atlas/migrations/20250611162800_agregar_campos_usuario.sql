-- Modify "users" table
ALTER TABLE "public"."users" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "first_name" character varying(50) NULL, ADD COLUMN "last_name" character varying(50) NULL, ADD COLUMN "password" character varying(100) NOT NULL, ADD COLUMN "enabled" boolean NOT NULL DEFAULT false, ADD COLUMN "last_access_time" timestamp NULL;
