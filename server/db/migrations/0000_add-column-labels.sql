CREATE TABLE "parent_announcements" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"info_title" varchar(255) NOT NULL,
	"info_content" text,
	"info_type" varchar(30) NOT NULL,
	"target_plans" jsonb,
	"target_tenant_ids" jsonb,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"config_is_dismissible" boolean DEFAULT true,
	"config_show_in_app" boolean DEFAULT true,
	"config_send_email" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "parent_audit_logs" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_tenant_id" uuid,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(100),
	"actor_email" varchar(255),
	"actor_ip" varchar(45),
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"description" text,
	"changes" jsonb,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "parent_feature_flags" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_code" varchar(50) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"config_default_enabled" boolean DEFAULT false NOT NULL,
	"config_enabled_plans" jsonb,
	CONSTRAINT "parent_feature_flags_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "parent_invoices" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"ref_subscription_id" uuid,
	"info_number" varchar(50),
	"info_period_start" date,
	"info_period_end" date,
	"info_due_date" date,
	"info_subtotal" numeric(10, 2),
	"info_tax" numeric(10, 2),
	"info_discount" numeric(10, 2),
	"info_total" numeric(10, 2),
	"info_amount_paid" numeric(10, 2),
	"info_amount_due" numeric(10, 2),
	"info_currency" varchar(3) DEFAULT 'USD',
	"info_line_items" jsonb,
	"info_paid_at" timestamp with time zone,
	"info_payment_method" varchar(50),
	"stripe_invoice_id" varchar(100),
	"stripe_payment_intent_id" varchar(100),
	"stripe_hosted_invoice_url" varchar(500),
	"stripe_pdf_url" varchar(500),
	"info_memo" text,
	CONSTRAINT "parent_invoices_info_number_unique" UNIQUE("info_number")
);
--> statement-breakpoint
CREATE TABLE "parent_payments" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"ref_invoice_id" uuid,
	"info_amount" numeric(10, 2) NOT NULL,
	"info_currency" varchar(3) DEFAULT 'USD',
	"info_payment_method" varchar(50),
	"info_card_brand" varchar(20),
	"info_card_last4" varchar(4),
	"info_failure_code" varchar(50),
	"info_failure_message" text,
	"info_refunded_amount" numeric(10, 2),
	"info_refunded_at" timestamp with time zone,
	"info_refund_reason" text,
	"stripe_payment_intent_id" varchar(100),
	"stripe_charge_id" varchar(100),
	"stripe_refund_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "parent_subscriptions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'trialing' NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"info_plan" varchar(30) NOT NULL,
	"info_billing_cycle" varchar(10) NOT NULL,
	"info_price_per_seat" numeric(10, 2),
	"info_base_price" numeric(10, 2),
	"info_discount_percent" numeric(5, 2),
	"info_included_seats" integer,
	"info_current_seats" integer DEFAULT 1,
	"info_max_seats" integer,
	"info_trial_ends_at" timestamp with time zone,
	"info_current_period_start" timestamp with time zone,
	"info_current_period_end" timestamp with time zone,
	"info_cancelled_at" timestamp with time zone,
	"info_cancel_at_period_end" boolean DEFAULT false,
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"stripe_price_id" varchar(100),
	"has_hipaa" boolean DEFAULT false NOT NULL,
	"has_gdpr" boolean DEFAULT false NOT NULL,
	"has_soc2" boolean DEFAULT false NOT NULL,
	"hipaa_baa_signed_at" timestamp with time zone,
	"gdpr_dpa_signed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parent_support_tickets" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'open' NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"info_number" varchar(20),
	"info_subject" varchar(255) NOT NULL,
	"info_description" text,
	"info_priority" varchar(20) DEFAULT 'normal',
	"info_category" varchar(50),
	"contact_email" varchar(255) NOT NULL,
	"contact_name" varchar(200),
	"info_resolved_at" timestamp with time zone,
	"info_resolution_notes" text,
	"assigned_to" varchar(100),
	"external_ticket_id" varchar(100),
	CONSTRAINT "parent_support_tickets_info_number_unique" UNIQUE("info_number")
);
--> statement-breakpoint
CREATE TABLE "parent_tenant_contacts" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"info_role" varchar(50) NOT NULL,
	"info_first_name" varchar(100) NOT NULL,
	"info_last_name" varchar(100) NOT NULL,
	"info_email" varchar(255) NOT NULL,
	"info_phone" varchar(30),
	"info_title" varchar(100),
	"config_is_primary" boolean DEFAULT false NOT NULL,
	"config_receives_invoices" boolean DEFAULT false NOT NULL,
	"config_receives_alerts" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_tenant_feature_overrides" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"ref_feature_id" uuid NOT NULL,
	"config_enabled" boolean NOT NULL,
	"info_reason" text,
	"info_expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parent_tenants" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'active' NOT NULL,
	"info_company_name" varchar(255) NOT NULL,
	"info_company_slug" varchar(30) NOT NULL,
	"info_industry" varchar(50),
	"info_company_size" varchar(20),
	"info_website" varchar(255),
	"info_logo_url" varchar(500),
	"neon_branch_id" varchar(100),
	"neon_branch_name" varchar(100),
	"neon_host" varchar(255),
	"neon_database_name" varchar(100) DEFAULT 'neondb',
	"connection_string" text,
	"owner_email" varchar(255) NOT NULL,
	"owner_first_name" varchar(100) NOT NULL,
	"owner_last_name" varchar(100) NOT NULL,
	"owner_phone" varchar(30),
	"onboarding_completed_at" timestamp with time zone,
	"onboarding_step" varchar(50) DEFAULT 'registered',
	"config_max_users" integer,
	"config_max_locations" integer,
	"config_max_storage_gb" integer,
	"config_api_rate_limit" integer,
	"internal_notes" text,
	"internal_tags" jsonb,
	CONSTRAINT "parent_tenants_info_company_slug_unique" UNIQUE("info_company_slug")
);
--> statement-breakpoint
CREATE TABLE "parent_usage_metrics" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_tenant_id" uuid NOT NULL,
	"info_period_start" timestamp with time zone NOT NULL,
	"info_period_end" timestamp with time zone NOT NULL,
	"info_period_type" varchar(20) NOT NULL,
	"metric_active_users" integer,
	"metric_total_users" integer,
	"metric_billable_users" integer,
	"metric_new_users" integer,
	"metric_logins" integer,
	"metric_api_calls" integer,
	"metric_reports_generated" integer,
	"metric_storage_used_mb" integer,
	"metric_documents_count" integer,
	"metric_feature_usage" jsonb
);
--> statement-breakpoint
CREATE TABLE "core_custom_field_definitions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"info_code" varchar(50) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"info_field_type" varchar(20) NOT NULL,
	"info_options" jsonb,
	"info_entity_type" varchar(50) NOT NULL,
	"config_is_required" boolean DEFAULT false NOT NULL,
	"config_is_searchable" boolean DEFAULT false NOT NULL,
	"config_is_visible_to_user" boolean DEFAULT true NOT NULL,
	"config_is_editable_by_user" boolean DEFAULT false NOT NULL,
	"config_display_order" integer DEFAULT 0 NOT NULL,
	"config_validation_regex" varchar(255),
	CONSTRAINT "core_custom_field_definitions_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_department_skills" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_department_id" uuid NOT NULL,
	"ref_skill_id" uuid NOT NULL,
	"info_min_proficiency_numeric" integer,
	"info_min_proficiency_text" varchar(20),
	"config_is_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_core_department_skills_dept_skill" UNIQUE("ref_department_id","ref_skill_id")
);
--> statement-breakpoint
CREATE TABLE "core_departments" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"ref_parent_id" uuid,
	"ref_location_id" uuid,
	"ref_manager_user_id" uuid,
	"info_code" varchar(20) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"info_cost_center" varchar(50),
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "core_departments_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_divisions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"info_code" varchar(20) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"info_color" varchar(7),
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "core_divisions_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_lines_of_business" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"ref_division_id" uuid,
	"info_code" varchar(20) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"info_color" varchar(7),
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "core_lines_of_business_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_locations" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"info_code" varchar(20) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"address_country_code" varchar(2),
	"address_state_code" varchar(10),
	"address_city" varchar(100),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"address_postal_code" varchar(20),
	"geo_timezone" varchar(50),
	"geo_latitude" numeric(10, 8),
	"geo_longitude" numeric(11, 8),
	"geo_geofence_radius_m" integer,
	"config_is_headquarters" boolean DEFAULT false NOT NULL,
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "core_locations_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_password_history" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"auth_password_hash" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_skills" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"info_code" varchar(50) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"info_category" varchar(50),
	"config_proficiency_scale" varchar(20),
	"config_requires_expiration" boolean DEFAULT false NOT NULL,
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "core_skills_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_user_assignments" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"ref_location_id" uuid,
	"ref_department_id" uuid,
	"ref_division_id" uuid,
	"ref_lob_id" uuid,
	"config_is_primary" boolean DEFAULT false NOT NULL,
	"info_start_date" date,
	"info_end_date" date
);
--> statement-breakpoint
CREATE TABLE "core_user_banking" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'pending_verification' NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"bank_account_type" varchar(20) NOT NULL,
	"bank_name" varchar(100),
	"bank_routing_number" varchar(20) NOT NULL,
	"bank_account_number" varchar(30) NOT NULL,
	"bank_account_holder_name" varchar(255) NOT NULL,
	"bank_verified_at" timestamp with time zone,
	"config_is_primary" boolean DEFAULT true NOT NULL,
	"config_percentage" numeric(5, 2),
	"config_flat_amount" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "core_user_compensation" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"pay_type" varchar(20) NOT NULL,
	"pay_rate" numeric(12, 2) NOT NULL,
	"pay_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"pay_frequency" varchar(20) NOT NULL,
	"pay_effective_date" date NOT NULL,
	"pay_end_date" date,
	"config_overtime_eligible" boolean DEFAULT false NOT NULL,
	"config_overtime_rate" numeric(5, 2),
	"info_notes" text
);
--> statement-breakpoint
CREATE TABLE "core_user_custom_fields" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"ref_field_id" uuid NOT NULL,
	"info_value_text" text,
	"info_value_number" numeric(15, 4),
	"info_value_date" date,
	"info_value_boolean" boolean,
	"info_value_json" jsonb,
	CONSTRAINT "uq_core_user_custom_fields_user_field" UNIQUE("ref_user_id","ref_field_id")
);
--> statement-breakpoint
CREATE TABLE "core_user_languages" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"info_language_code" varchar(10) NOT NULL,
	"info_proficiency" varchar(20) NOT NULL,
	"config_is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_user_skills" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"ref_skill_id" uuid NOT NULL,
	"info_proficiency_numeric" integer,
	"info_proficiency_text" varchar(20),
	"info_certified_at" date,
	"info_expires_at" date,
	"info_notes" text,
	"config_is_verified" boolean DEFAULT false NOT NULL,
	"ref_verified_by" uuid,
	"info_verified_at" timestamp with time zone,
	CONSTRAINT "uq_core_user_skills_user_skill" UNIQUE("ref_user_id","ref_skill_id")
);
--> statement-breakpoint
CREATE TABLE "core_user_tax" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"tax_ssn" varchar(50),
	"tax_id" varchar(50),
	"tax_id_type" varchar(20),
	"tax_country" varchar(2),
	"tax_w4_filing_status" varchar(20),
	"tax_w4_allowances" integer,
	"tax_w4_additional_withholding" numeric(10, 2),
	"tax_w4_exempt" boolean DEFAULT false,
	"tax_state_filing_status" varchar(20),
	"tax_state_allowances" integer,
	"tax_i9_verified_at" timestamp with time zone,
	"tax_i9_document_type" varchar(50),
	CONSTRAINT "core_user_tax_ref_user_id_unique" UNIQUE("ref_user_id")
);
--> statement-breakpoint
CREATE TABLE "core_user_types" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_code" varchar(30) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"config_is_billable" boolean DEFAULT true NOT NULL,
	"config_requires_w2" boolean DEFAULT false NOT NULL,
	"config_requires_1099" boolean DEFAULT false NOT NULL,
	"config_is_system" boolean DEFAULT false NOT NULL,
	CONSTRAINT "core_user_types_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "core_users" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'invited' NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_deleted_at" timestamp with time zone,
	"ref_user_type_id" uuid,
	"auth_password_hash" varchar(255),
	"auth_email_verified_at" timestamp with time zone,
	"auth_last_login_at" timestamp with time zone,
	"auth_mfa_enabled" boolean DEFAULT false NOT NULL,
	"auth_mfa_secret" varchar(255),
	"auth_onboarding_completed_at" timestamp with time zone,
	"personal_first_name" varchar(100) NOT NULL,
	"personal_preferred_name" varchar(100),
	"personal_last_name" varchar(100) NOT NULL,
	"personal_maiden_name" varchar(100),
	"personal_email" varchar(255) NOT NULL,
	"personal_phone" varchar(30),
	"personal_phone_country_code" varchar(5),
	"personal_avatar_url" varchar(500),
	"personal_date_of_birth" date,
	"personal_gender" varchar(20),
	"personal_nationality" varchar(10),
	"personal_ssn" varchar(50),
	"personal_address_country_code" varchar(2),
	"personal_address_state_code" varchar(10),
	"personal_address_city" varchar(100),
	"personal_address_line1" varchar(255),
	"personal_address_line2" varchar(255),
	"personal_address_postal_code" varchar(20),
	"emergency_contact_name" varchar(100),
	"emergency_contact_relationship" varchar(50),
	"emergency_contact_phone" varchar(30),
	"emergency_contact_email" varchar(255),
	"emergency_contact_address" text,
	"company_email" varchar(255),
	"company_phone" varchar(30),
	"company_phone_ext" varchar(10),
	"company_employee_id" varchar(50),
	"company_title" varchar(100),
	"company_department" varchar(100),
	"company_division" varchar(100),
	"company_location" varchar(100),
	"company_start_date" date,
	"company_employment_type" varchar(30),
	"company_hire_date" date,
	"company_termination_date" date,
	"company_avatar_url" varchar(500),
	CONSTRAINT "core_users_company_email_unique" UNIQUE("company_email")
);
--> statement-breakpoint
CREATE TABLE "rbac_permissions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_code" varchar(100) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_category" varchar(50) NOT NULL,
	"info_description" text,
	"config_is_system" boolean DEFAULT false NOT NULL,
	CONSTRAINT "rbac_permissions_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "rbac_role_permissions" (
	"ref_role_id" uuid NOT NULL,
	"ref_permission_id" uuid NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rbac_role_permissions_ref_role_id_ref_permission_id_pk" PRIMARY KEY("ref_role_id","ref_permission_id")
);
--> statement-breakpoint
CREATE TABLE "rbac_roles" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_code" varchar(50) NOT NULL,
	"info_name" varchar(100) NOT NULL,
	"info_description" text,
	"config_hierarchy_level" integer NOT NULL,
	"config_is_system" boolean DEFAULT false NOT NULL,
	"config_is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "rbac_roles_info_code_unique" UNIQUE("info_code")
);
--> statement-breakpoint
CREATE TABLE "rbac_user_roles" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"ref_role_id" uuid NOT NULL,
	"ref_assigned_by" uuid,
	"info_scope_type" varchar(20) DEFAULT 'global' NOT NULL,
	"info_scope_id" uuid,
	"info_assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_expires_at" timestamp with time zone,
	CONSTRAINT "rbac_user_roles_unique" UNIQUE("ref_user_id","ref_role_id","info_scope_type","info_scope_id")
);
--> statement-breakpoint
CREATE TABLE "settings_company" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_company_name" varchar(255) NOT NULL,
	"info_company_slug" varchar(30) NOT NULL,
	"info_tagline" varchar(500),
	"info_industry" varchar(50),
	"info_company_size" varchar(20),
	"info_website" varchar(255),
	"info_tax_id" varchar(100),
	"brand_logo_url" varchar(500),
	"brand_header_image_url" varchar(500),
	"brand_use_custom_header" boolean DEFAULT false NOT NULL,
	"config_default_timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"config_date_format" varchar(20) DEFAULT 'MM/DD/YYYY' NOT NULL,
	"config_time_format" varchar(10) DEFAULT '12h' NOT NULL,
	"config_week_start" varchar(10) DEFAULT 'sunday' NOT NULL,
	"config_fiscal_year_start" varchar(5) DEFAULT '01-01' NOT NULL,
	"config_location_mode" varchar(10) DEFAULT 'single' NOT NULL,
	"config_department_mode" varchar(10) DEFAULT 'single' NOT NULL,
	"config_division_mode" varchar(10) DEFAULT 'single' NOT NULL,
	"config_lob_mode" varchar(10) DEFAULT 'single' NOT NULL,
	"config_retention_days" integer DEFAULT 30,
	"config_password_history_count" integer DEFAULT 12 NOT NULL,
	"config_password_min_length" integer DEFAULT 12 NOT NULL,
	"config_password_require_special" boolean DEFAULT true NOT NULL,
	"config_session_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"config_mfa_required" boolean DEFAULT false NOT NULL,
	"config_column_labels" jsonb,
	CONSTRAINT "settings_company_info_company_slug_unique" UNIQUE("info_company_slug")
);
--> statement-breakpoint
CREATE TABLE "settings_user" (
	"ref_user_id" uuid PRIMARY KEY NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pref_theme" varchar(20) DEFAULT 'system' NOT NULL,
	"pref_color_palette" varchar(20) DEFAULT 'corporate' NOT NULL,
	"pref_timezone" varchar(50),
	"pref_date_format" varchar(20),
	"pref_time_format" varchar(10),
	"pref_language" varchar(10) DEFAULT 'en' NOT NULL,
	"notif_email" boolean DEFAULT true NOT NULL,
	"notif_push" boolean DEFAULT true NOT NULL,
	"notif_sms" boolean DEFAULT false NOT NULL,
	"ui_directory_columns" jsonb
);
--> statement-breakpoint
CREATE TABLE "billing_addresses" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"config_same_as_company" boolean DEFAULT false,
	"address_country_code" varchar(2),
	"address_state_code" varchar(10),
	"address_city" varchar(100),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"address_postal_code" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "billing_compliance" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_subscription_id" uuid NOT NULL,
	"info_compliance_type" varchar(20) NOT NULL,
	"info_price_per_seat" numeric(10, 2),
	"info_baa_signed_at" timestamp with time zone,
	"info_dpa_signed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stripe_invoice_id" varchar(100),
	"info_number" varchar(50),
	"info_amount" numeric(10, 2),
	"info_currency" varchar(3) DEFAULT 'USD',
	"info_period_start" date,
	"info_period_end" date,
	"info_due_date" date,
	"info_paid_at" timestamp with time zone,
	"info_pdf_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "billing_payment_methods" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stripe_payment_method_id" varchar(100),
	"info_card_brand" varchar(20),
	"info_card_last4" varchar(4),
	"info_card_exp_month" integer,
	"info_card_exp_year" integer,
	"info_cardholder_name" varchar(255),
	"config_is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "billing_subscription" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_status" varchar(20) DEFAULT 'trialing' NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"info_plan" varchar(20) NOT NULL,
	"info_billing_cycle" varchar(10) NOT NULL,
	"info_estimated_seats" varchar(20),
	"info_price_per_seat" numeric(10, 2),
	"info_trial_ends_at" timestamp with time zone,
	"info_current_period_start" timestamp with time zone,
	"info_current_period_end" timestamp with time zone,
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid,
	"ref_session_id" uuid,
	"audit_action" varchar(50) NOT NULL,
	"audit_resource_type" varchar(50) NOT NULL,
	"audit_resource_id" uuid,
	"audit_changes" jsonb,
	"audit_ip_address" "inet",
	"audit_user_agent" text
);
--> statement-breakpoint
CREATE TABLE "audit_sessions" (
	"meta_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meta_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_user_id" uuid NOT NULL,
	"auth_token_hash" varchar(255) NOT NULL,
	"audit_ip_address" "inet",
	"audit_user_agent" text,
	"audit_device_fingerprint" varchar(255),
	"info_last_active_at" timestamp with time zone,
	"info_expires_at" timestamp with time zone,
	"info_revoked_at" timestamp with time zone,
	"info_revoked_reason" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "parent_audit_logs" ADD CONSTRAINT "parent_audit_logs_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_invoices" ADD CONSTRAINT "parent_invoices_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_invoices" ADD CONSTRAINT "parent_invoices_ref_subscription_id_parent_subscriptions_meta_id_fk" FOREIGN KEY ("ref_subscription_id") REFERENCES "public"."parent_subscriptions"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_payments" ADD CONSTRAINT "parent_payments_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_payments" ADD CONSTRAINT "parent_payments_ref_invoice_id_parent_invoices_meta_id_fk" FOREIGN KEY ("ref_invoice_id") REFERENCES "public"."parent_invoices"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_subscriptions" ADD CONSTRAINT "parent_subscriptions_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_support_tickets" ADD CONSTRAINT "parent_support_tickets_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_tenant_contacts" ADD CONSTRAINT "parent_tenant_contacts_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_tenant_feature_overrides" ADD CONSTRAINT "parent_tenant_feature_overrides_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_tenant_feature_overrides" ADD CONSTRAINT "parent_tenant_feature_overrides_ref_feature_id_parent_feature_flags_meta_id_fk" FOREIGN KEY ("ref_feature_id") REFERENCES "public"."parent_feature_flags"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_usage_metrics" ADD CONSTRAINT "parent_usage_metrics_ref_tenant_id_parent_tenants_meta_id_fk" FOREIGN KEY ("ref_tenant_id") REFERENCES "public"."parent_tenants"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_department_skills" ADD CONSTRAINT "core_department_skills_ref_department_id_core_departments_meta_id_fk" FOREIGN KEY ("ref_department_id") REFERENCES "public"."core_departments"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_department_skills" ADD CONSTRAINT "core_department_skills_ref_skill_id_core_skills_meta_id_fk" FOREIGN KEY ("ref_skill_id") REFERENCES "public"."core_skills"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_ref_location_id_core_locations_meta_id_fk" FOREIGN KEY ("ref_location_id") REFERENCES "public"."core_locations"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_ref_manager_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_manager_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_lines_of_business" ADD CONSTRAINT "core_lines_of_business_ref_division_id_core_divisions_meta_id_fk" FOREIGN KEY ("ref_division_id") REFERENCES "public"."core_divisions"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_password_history" ADD CONSTRAINT "core_password_history_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_assignments" ADD CONSTRAINT "core_user_assignments_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_assignments" ADD CONSTRAINT "core_user_assignments_ref_location_id_core_locations_meta_id_fk" FOREIGN KEY ("ref_location_id") REFERENCES "public"."core_locations"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_assignments" ADD CONSTRAINT "core_user_assignments_ref_department_id_core_departments_meta_id_fk" FOREIGN KEY ("ref_department_id") REFERENCES "public"."core_departments"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_assignments" ADD CONSTRAINT "core_user_assignments_ref_division_id_core_divisions_meta_id_fk" FOREIGN KEY ("ref_division_id") REFERENCES "public"."core_divisions"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_assignments" ADD CONSTRAINT "core_user_assignments_ref_lob_id_core_lines_of_business_meta_id_fk" FOREIGN KEY ("ref_lob_id") REFERENCES "public"."core_lines_of_business"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_banking" ADD CONSTRAINT "core_user_banking_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_compensation" ADD CONSTRAINT "core_user_compensation_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_custom_fields" ADD CONSTRAINT "core_user_custom_fields_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_custom_fields" ADD CONSTRAINT "core_user_custom_fields_ref_field_id_core_custom_field_definitions_meta_id_fk" FOREIGN KEY ("ref_field_id") REFERENCES "public"."core_custom_field_definitions"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_languages" ADD CONSTRAINT "core_user_languages_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_skills" ADD CONSTRAINT "core_user_skills_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_skills" ADD CONSTRAINT "core_user_skills_ref_skill_id_core_skills_meta_id_fk" FOREIGN KEY ("ref_skill_id") REFERENCES "public"."core_skills"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_skills" ADD CONSTRAINT "core_user_skills_ref_verified_by_core_users_meta_id_fk" FOREIGN KEY ("ref_verified_by") REFERENCES "public"."core_users"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_tax" ADD CONSTRAINT "core_user_tax_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_users" ADD CONSTRAINT "core_users_ref_user_type_id_core_user_types_meta_id_fk" FOREIGN KEY ("ref_user_type_id") REFERENCES "public"."core_user_types"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_role_permissions" ADD CONSTRAINT "rbac_role_permissions_ref_role_id_rbac_roles_meta_id_fk" FOREIGN KEY ("ref_role_id") REFERENCES "public"."rbac_roles"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_role_permissions" ADD CONSTRAINT "rbac_role_permissions_ref_permission_id_rbac_permissions_meta_id_fk" FOREIGN KEY ("ref_permission_id") REFERENCES "public"."rbac_permissions"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_user_roles" ADD CONSTRAINT "rbac_user_roles_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_user_roles" ADD CONSTRAINT "rbac_user_roles_ref_role_id_rbac_roles_meta_id_fk" FOREIGN KEY ("ref_role_id") REFERENCES "public"."rbac_roles"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_user_roles" ADD CONSTRAINT "rbac_user_roles_ref_assigned_by_core_users_meta_id_fk" FOREIGN KEY ("ref_assigned_by") REFERENCES "public"."core_users"("meta_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_user" ADD CONSTRAINT "settings_user_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_compliance" ADD CONSTRAINT "billing_compliance_ref_subscription_id_billing_subscription_meta_id_fk" FOREIGN KEY ("ref_subscription_id") REFERENCES "public"."billing_subscription"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_ref_session_id_audit_sessions_meta_id_fk" FOREIGN KEY ("ref_session_id") REFERENCES "public"."audit_sessions"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_ref_user_id_core_users_meta_id_fk" FOREIGN KEY ("ref_user_id") REFERENCES "public"."core_users"("meta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_parent_announcements_status" ON "parent_announcements" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_announcements_type" ON "parent_announcements" USING btree ("info_type");--> statement-breakpoint
CREATE INDEX "idx_parent_audit_logs_tenant" ON "parent_audit_logs" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_audit_logs_action" ON "parent_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_parent_audit_logs_created_at" ON "parent_audit_logs" USING btree ("meta_created_at");--> statement-breakpoint
CREATE INDEX "idx_parent_feature_flags_code" ON "parent_feature_flags" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_parent_invoices_tenant" ON "parent_invoices" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_invoices_status" ON "parent_invoices" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_invoices_created_at" ON "parent_invoices" USING btree ("meta_created_at");--> statement-breakpoint
CREATE INDEX "idx_parent_invoices_stripe" ON "parent_invoices" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_parent_payments_tenant" ON "parent_payments" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_payments_status" ON "parent_payments" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_payments_created_at" ON "parent_payments" USING btree ("meta_created_at");--> statement-breakpoint
CREATE INDEX "idx_parent_subscriptions_tenant" ON "parent_subscriptions" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_subscriptions_status" ON "parent_subscriptions" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_subscriptions_plan" ON "parent_subscriptions" USING btree ("info_plan");--> statement-breakpoint
CREATE INDEX "idx_parent_subscriptions_stripe_customer" ON "parent_subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_parent_support_tickets_tenant" ON "parent_support_tickets" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_support_tickets_status" ON "parent_support_tickets" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_support_tickets_priority" ON "parent_support_tickets" USING btree ("info_priority");--> statement-breakpoint
CREATE INDEX "idx_parent_tenant_contacts_tenant" ON "parent_tenant_contacts" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_tenant_contacts_role" ON "parent_tenant_contacts" USING btree ("info_role");--> statement-breakpoint
CREATE INDEX "idx_parent_tenant_feature_overrides_tenant" ON "parent_tenant_feature_overrides" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_tenant_feature_overrides_feature" ON "parent_tenant_feature_overrides" USING btree ("ref_feature_id");--> statement-breakpoint
CREATE INDEX "idx_parent_tenants_slug" ON "parent_tenants" USING btree ("info_company_slug");--> statement-breakpoint
CREATE INDEX "idx_parent_tenants_status" ON "parent_tenants" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_parent_tenants_owner_email" ON "parent_tenants" USING btree ("owner_email");--> statement-breakpoint
CREATE INDEX "idx_parent_tenants_created_at" ON "parent_tenants" USING btree ("meta_created_at");--> statement-breakpoint
CREATE INDEX "idx_parent_usage_metrics_tenant" ON "parent_usage_metrics" USING btree ("ref_tenant_id");--> statement-breakpoint
CREATE INDEX "idx_parent_usage_metrics_period" ON "parent_usage_metrics" USING btree ("info_period_start","info_period_end");--> statement-breakpoint
CREATE INDEX "idx_core_custom_field_definitions_info_code" ON "core_custom_field_definitions" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_custom_field_definitions_info_entity_type" ON "core_custom_field_definitions" USING btree ("info_entity_type");--> statement-breakpoint
CREATE INDEX "idx_core_department_skills_ref_department_id" ON "core_department_skills" USING btree ("ref_department_id");--> statement-breakpoint
CREATE INDEX "idx_core_department_skills_ref_skill_id" ON "core_department_skills" USING btree ("ref_skill_id");--> statement-breakpoint
CREATE INDEX "idx_core_departments_info_code" ON "core_departments" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_departments_ref_parent_id" ON "core_departments" USING btree ("ref_parent_id");--> statement-breakpoint
CREATE INDEX "idx_core_departments_ref_location_id" ON "core_departments" USING btree ("ref_location_id");--> statement-breakpoint
CREATE INDEX "idx_core_departments_config_is_active" ON "core_departments" USING btree ("config_is_active");--> statement-breakpoint
CREATE INDEX "idx_core_divisions_info_code" ON "core_divisions" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_divisions_config_is_active" ON "core_divisions" USING btree ("config_is_active");--> statement-breakpoint
CREATE INDEX "idx_core_lines_of_business_info_code" ON "core_lines_of_business" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_lines_of_business_ref_division_id" ON "core_lines_of_business" USING btree ("ref_division_id");--> statement-breakpoint
CREATE INDEX "idx_core_lines_of_business_config_is_active" ON "core_lines_of_business" USING btree ("config_is_active");--> statement-breakpoint
CREATE INDEX "idx_core_locations_info_code" ON "core_locations" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_locations_config_is_active" ON "core_locations" USING btree ("config_is_active");--> statement-breakpoint
CREATE INDEX "idx_core_password_history_ref_user_id_created" ON "core_password_history" USING btree ("ref_user_id","meta_created_at");--> statement-breakpoint
CREATE INDEX "idx_core_skills_info_code" ON "core_skills" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "idx_core_skills_info_category" ON "core_skills" USING btree ("info_category");--> statement-breakpoint
CREATE INDEX "idx_core_skills_config_is_active" ON "core_skills" USING btree ("config_is_active");--> statement-breakpoint
CREATE INDEX "idx_core_user_assignments_ref_user_id" ON "core_user_assignments" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_assignments_ref_location_id" ON "core_user_assignments" USING btree ("ref_location_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_assignments_ref_department_id" ON "core_user_assignments" USING btree ("ref_department_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_assignments_ref_division_id" ON "core_user_assignments" USING btree ("ref_division_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_assignments_ref_lob_id" ON "core_user_assignments" USING btree ("ref_lob_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_banking_ref_user_id" ON "core_user_banking" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_compensation_ref_user_id" ON "core_user_compensation" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_compensation_pay_effective_date" ON "core_user_compensation" USING btree ("pay_effective_date");--> statement-breakpoint
CREATE INDEX "idx_core_user_custom_fields_ref_user_id" ON "core_user_custom_fields" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_custom_fields_ref_field_id" ON "core_user_custom_fields" USING btree ("ref_field_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_languages_ref_user_id" ON "core_user_languages" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_skills_ref_user_id" ON "core_user_skills" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_skills_ref_skill_id" ON "core_user_skills" USING btree ("ref_skill_id");--> statement-breakpoint
CREATE INDEX "idx_core_user_tax_ref_user_id" ON "core_user_tax" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "idx_core_users_personal_email" ON "core_users" USING btree ("personal_email");--> statement-breakpoint
CREATE INDEX "idx_core_users_meta_status" ON "core_users" USING btree ("meta_status");--> statement-breakpoint
CREATE INDEX "idx_core_users_ref_user_type_id" ON "core_users" USING btree ("ref_user_type_id");--> statement-breakpoint
CREATE INDEX "rbac_permissions_info_code_idx" ON "rbac_permissions" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "rbac_permissions_info_category_idx" ON "rbac_permissions" USING btree ("info_category");--> statement-breakpoint
CREATE INDEX "rbac_role_permissions_ref_role_id_idx" ON "rbac_role_permissions" USING btree ("ref_role_id");--> statement-breakpoint
CREATE INDEX "rbac_role_permissions_ref_permission_id_idx" ON "rbac_role_permissions" USING btree ("ref_permission_id");--> statement-breakpoint
CREATE INDEX "rbac_roles_info_code_idx" ON "rbac_roles" USING btree ("info_code");--> statement-breakpoint
CREATE INDEX "rbac_roles_config_hierarchy_level_idx" ON "rbac_roles" USING btree ("config_hierarchy_level");--> statement-breakpoint
CREATE INDEX "rbac_user_roles_ref_user_id_idx" ON "rbac_user_roles" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "rbac_user_roles_ref_role_id_idx" ON "rbac_user_roles" USING btree ("ref_role_id");--> statement-breakpoint
CREATE INDEX "rbac_user_roles_info_scope_type_idx" ON "rbac_user_roles" USING btree ("info_scope_type");--> statement-breakpoint
CREATE INDEX "rbac_user_roles_info_scope_id_idx" ON "rbac_user_roles" USING btree ("info_scope_id");--> statement-breakpoint
CREATE INDEX "audit_logs_meta_created_at_idx" ON "audit_logs" USING btree ("meta_created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ref_user_id_idx" ON "audit_logs" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_audit_resource_type_idx" ON "audit_logs" USING btree ("audit_resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_audit_action_idx" ON "audit_logs" USING btree ("audit_action");--> statement-breakpoint
CREATE INDEX "audit_sessions_ref_user_id_idx" ON "audit_sessions" USING btree ("ref_user_id");--> statement-breakpoint
CREATE INDEX "audit_sessions_info_expires_at_idx" ON "audit_sessions" USING btree ("info_expires_at");