-- Create rbac_field_sensitivity table for configurable data sensitivity levels
CREATE TABLE "rbac_field_sensitivity" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_table_name" varchar(100) NOT NULL,
	"info_field_name" varchar(100) NOT NULL,
	"info_display_name" varchar(150),
	"info_description" text,
	"config_sensitivity_level" integer DEFAULT 7 NOT NULL,
	"config_masking_type" varchar(20) DEFAULT 'full',
	"config_is_system" boolean DEFAULT false NOT NULL,
	"config_min_level" integer,
	"ref_updated_by" uuid,
	CONSTRAINT "rbac_field_sensitivity_unique" UNIQUE("info_table_name","info_field_name")
);
--> statement-breakpoint
-- Add config_max_sensitivity_level to rbac_roles
ALTER TABLE "rbac_roles" ADD COLUMN "config_max_sensitivity_level" integer DEFAULT 7 NOT NULL;
--> statement-breakpoint
-- Add config_field_sensitivity JSONB cache to settings_company
ALTER TABLE "settings_company" ADD COLUMN "config_field_sensitivity" jsonb;
--> statement-breakpoint
-- Add foreign key constraint for ref_updated_by
ALTER TABLE "rbac_field_sensitivity" ADD CONSTRAINT "rbac_field_sensitivity_ref_updated_by_core_users_meta_id_fk" FOREIGN KEY ("ref_updated_by") REFERENCES "public"."core_users"("meta_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Create indexes for efficient lookups
CREATE INDEX "rbac_field_sensitivity_table_idx" ON "rbac_field_sensitivity" USING btree ("info_table_name");
--> statement-breakpoint
CREATE INDEX "rbac_field_sensitivity_level_idx" ON "rbac_field_sensitivity" USING btree ("config_sensitivity_level");
