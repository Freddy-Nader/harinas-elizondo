CREATE TABLE "client_delivery_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"address" varchar(250) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "fiscal_address" varchar(250);--> statement-breakpoint
ALTER TABLE "client_delivery_addresses" ADD CONSTRAINT "client_delivery_addresses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_delivery_addresses_position_uq" ON "client_delivery_addresses" USING btree ("client_id","position");
--> statement-breakpoint
INSERT INTO "client_delivery_addresses" ("client_id", "address", "position")
SELECT "id", trim("delivery_address"), 0 FROM "clients"
WHERE "delivery_address" IS NOT NULL AND trim("delivery_address") <> '';
