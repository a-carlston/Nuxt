-- Role Groups table for organizing roles into folders
CREATE TABLE IF NOT EXISTS "rbac_role_groups" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"config_display_order" integer DEFAULT 0 NOT NULL,
	"config_is_collapsed" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_groups_display_order_idx" ON "rbac_role_groups" USING btree ("config_display_order");
--> statement-breakpoint

-- Role Tags table for categorizing roles
CREATE TABLE IF NOT EXISTS "rbac_role_tags" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_name" varchar(50) NOT NULL,
	"info_color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"config_display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rbac_role_tags_name_unique" UNIQUE("info_name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_tags_display_order_idx" ON "rbac_role_tags" USING btree ("config_display_order");
--> statement-breakpoint

-- Role-Tag junction table
CREATE TABLE IF NOT EXISTS "rbac_role_tag_assignments" (
	"ref_role_id" uuid NOT NULL,
	"ref_tag_id" uuid NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("ref_role_id", "ref_tag_id")
);
--> statement-breakpoint
ALTER TABLE "rbac_role_tag_assignments" ADD CONSTRAINT "rbac_role_tag_assignments_ref_role_id_rbac_roles_meta_id_fk" FOREIGN KEY ("ref_role_id") REFERENCES "public"."rbac_roles"("meta_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rbac_role_tag_assignments" ADD CONSTRAINT "rbac_role_tag_assignments_ref_tag_id_rbac_role_tags_meta_id_fk" FOREIGN KEY ("ref_tag_id") REFERENCES "public"."rbac_role_tags"("meta_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_tag_assignments_ref_role_id_idx" ON "rbac_role_tag_assignments" USING btree ("ref_role_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_role_tag_assignments_ref_tag_id_idx" ON "rbac_role_tag_assignments" USING btree ("ref_tag_id");
--> statement-breakpoint

-- Add group reference and display order to roles table
ALTER TABLE "rbac_roles" ADD COLUMN IF NOT EXISTS "ref_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "rbac_roles" ADD COLUMN IF NOT EXISTS "config_display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rbac_roles" ADD CONSTRAINT "rbac_roles_ref_group_id_rbac_role_groups_meta_id_fk" FOREIGN KEY ("ref_group_id") REFERENCES "public"."rbac_role_groups"("meta_id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_roles_ref_group_id_idx" ON "rbac_roles" USING btree ("ref_group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rbac_roles_config_display_order_idx" ON "rbac_roles" USING btree ("config_display_order");
