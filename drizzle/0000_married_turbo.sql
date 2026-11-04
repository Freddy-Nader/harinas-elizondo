CREATE TYPE "public"."certificate_status" AS ENUM('draft', 'issued', 'sent');--> statement-breakpoint
CREATE TYPE "public"."equipment_type" AS ENUM('alveograph', 'farinograph');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'inactive', 'retired');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"employee_id" varchar(10),
	"user_name" varchar(100),
	"action" varchar(40) NOT NULL,
	"entity" varchar(30) NOT NULL,
	"entity_id" varchar(40) NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "certificate_lines" (
	"certificate_id" varchar(16) NOT NULL,
	"parameter_code" varchar(10) NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	"lower_limit" numeric(10, 3) NOT NULL,
	"upper_limit" numeric(10, 3) NOT NULL,
	"deviation" numeric(10, 3) NOT NULL,
	CONSTRAINT "certificate_lines_certificate_id_parameter_code_pk" PRIMARY KEY("certificate_id","parameter_code")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"lot_id" varchar(20) NOT NULL,
	"inspection_id" integer NOT NULL,
	"purchase_order" varchar(20) NOT NULL,
	"invoice_number" varchar(20),
	"quantity_requested" numeric(10, 3),
	"quantity_delivered" numeric(10, 3),
	"shipped_on" date,
	"requires_signature" boolean DEFAULT false NOT NULL,
	"status" "certificate_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" text,
	"issued_at" timestamp with time zone,
	"issued_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_limits" (
	"client_id" uuid NOT NULL,
	"parameter_code" varchar(10) NOT NULL,
	"lower_limit" numeric(10, 3) NOT NULL,
	"upper_limit" numeric(10, 3) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "client_limits_client_id_parameter_code_pk" PRIMARY KEY("client_id","parameter_code"),
	CONSTRAINT "client_limits_range_ck" CHECK ("client_limits"."lower_limit" <= "client_limits"."upper_limit")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sap_key" varchar(10) NOT NULL,
	"business_name" varchar(150) NOT NULL,
	"rfc" varchar(13),
	"delivery_address" varchar(250),
	"contact_name" varchar(100),
	"contact_email" varchar(100),
	"requires_certificate" boolean DEFAULT true NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"status_reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "clients_sapKey_unique" UNIQUE("sap_key")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"certificate_id" varchar(16) NOT NULL,
	"recipients" text[] NOT NULL,
	"succeeded" boolean NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_by" text
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" char(8) PRIMARY KEY NOT NULL,
	"type" "equipment_type" NOT NULL,
	"short_description" varchar(60) NOT NULL,
	"long_description" text,
	"brand" varchar(40),
	"model" varchar(40),
	"serial_number" varchar(30),
	"supplier" varchar(80),
	"acquired_on" date,
	"warranty_until" date,
	"location" varchar(80),
	"responsible" varchar(100),
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"status_reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "equipment_serialNumber_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "inspection_results" (
	"inspection_id" integer NOT NULL,
	"parameter_code" varchar(10) NOT NULL,
	"equipment_id" char(8) NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	CONSTRAINT "inspection_results_inspection_id_parameter_code_pk" PRIMARY KEY("inspection_id","parameter_code")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"lot_id" varchar(20) NOT NULL,
	"sequence" varchar(3) NOT NULL,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reinspection_reason" varchar(200),
	"locked_at" timestamp with time zone,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "international_limits" (
	"parameter_code" varchar(10) PRIMARY KEY NOT NULL,
	"lower_limit" numeric(10, 3) NOT NULL,
	"upper_limit" numeric(10, 3) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "international_limits_range_ck" CHECK ("international_limits"."lower_limit" <= "international_limits"."upper_limit")
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"product" varchar(60) NOT NULL,
	"produced_on" date NOT NULL,
	"expires_on" date NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "parameters" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"equipment_type" "equipment_type" NOT NULL,
	"label" varchar(60) NOT NULL,
	"unit" varchar(15) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'query' NOT NULL,
	"employee_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_employeeId_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_lines" ADD CONSTRAINT "certificate_lines_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_lines" ADD CONSTRAINT "certificate_lines_parameter_code_parameters_code_fk" FOREIGN KEY ("parameter_code") REFERENCES "public"."parameters"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_limits" ADD CONSTRAINT "client_limits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_limits" ADD CONSTRAINT "client_limits_parameter_code_parameters_code_fk" FOREIGN KEY ("parameter_code") REFERENCES "public"."parameters"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_limits" ADD CONSTRAINT "client_limits_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_parameter_code_parameters_code_fk" FOREIGN KEY ("parameter_code") REFERENCES "public"."parameters"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_limits" ADD CONSTRAINT "international_limits_parameter_code_parameters_code_fk" FOREIGN KEY ("parameter_code") REFERENCES "public"."parameters"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_limits" ADD CONSTRAINT "international_limits_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "certificates_client_idx" ON "certificates" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "certificates_lot_idx" ON "certificates" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspections_lot_sequence_uq" ON "inspections" USING btree ("lot_id","sequence");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");