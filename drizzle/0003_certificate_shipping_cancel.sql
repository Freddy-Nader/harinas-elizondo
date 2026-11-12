ALTER TYPE "public"."certificate_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "delivery_address" varchar(250);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "carrier" varchar(100);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "signature_hash" char(64);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "cancellation_reason" varchar(200);--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;