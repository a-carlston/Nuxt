CREATE TABLE "core_user_supervisors" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"ref_supervisor_id" uuid NOT NULL,
	"info_relationship_type" varchar(20) DEFAULT 'direct' NOT NULL,
	"info_effective_date" date,
	"info_end_date" date,
	"config_is_primary" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_core_user_supervisors_user_supervisor_type" UNIQUE("ref_user_id","ref_supervisor_id","info_relationship_type")
);
--> statement-breakpoint
CREATE TABLE "rbac_tag_permissions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_tag" varchar(50) NOT NULL,
	"info_target_tags" text[],
	"ref_permission_id" uuid NOT NULL,
	"config_effect" varchar(10) DEFAULT 'grant' NOT NULL,
	"config_priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rbac_user_tags" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"info_tag" varchar(50) NOT NULL,
	"info_category" varchar(30) NOT NULL,
	CONSTRAINT "rbac_user_tags_unique" UNIQUE("ref_user_id","info_tag")
);
--> statement-breakpoint
ALTER TABLE "core_users" ALTER COLUMN "personal_nationality" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "settings_company" ADD COLUMN "config_default_role_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "audit_data_level" varchar(20);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "audit_fields_accessed" jsonb;--> statement-breakpoint
ALTER TABLE "core_user_supervisors" ADD CONSTRAINT "core_user_supervisors_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_supervisors" ADD CONSTRAINT "core_user_supervisors_ref_supervisor_id_core_users_meta_id_fk" FOREIGN KEY ("ref_supervisor_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_tag_permissions" ADD CONSTRAINT "rbac_tag_permissions_ref_permission_id_rbac_permissions_meta_id_fk" FOREIGN KEY ("ref_permission_id") REFERENCES "public"."rbac_permissions"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_user_tags" ADD CONSTRAINT "rbac_user_tags_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_core_user_supervisors_ref_user_id" ON "core_user_supervisors" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_supervisors_ref_supervisor_id" ON "core_user_supervisors" USING btree ("ref_supervisor_id");--> statement-breakpoint
CREATE INDEX "rbac_tag_permissions_info_tag_idx" ON "rbac_tag_permissions" USING btree ("info_tag");--> statement-breakpoint
CREATE INDEX "rbac_tag_permissions_ref_permission_id_idx" ON "rbac_tag_permissions" USING btree ("ref_permission_id");--> statement-breakpoint
CREATE INDEX "rbac_tag_permissions_config_effect_idx" ON "rbac_tag_permissions" USING btree ("config_effect");--> statement-breakpoint
CREATE INDEX "rbac_user_tags_ref_user_id_idx" ON "rbac_user_tags" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "rbac_user_tags_info_tag_idx" ON "rbac_user_tags" USING btree ("info_tag");--> statement-breakpoint
CREATE INDEX "rbac_user_tags_info_category_idx" ON "rbac_user_tags" USING btree ("info_category");--> statement-breakpoint
ALTER TABLE "settings_company" ADD CONSTRAINT "settings_company_config_default_role_id_rbac_roles_meta_id_fk" FOREIGN KEY ("config_default_role_id") REFERENCES "public"."rbac_roles"("meta_id") ON DELETE set null ON UPDATE no action;