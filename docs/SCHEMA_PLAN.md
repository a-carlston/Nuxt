# Database Schema Plan - ShiftFlow SaaS

## Column Prefix System (for ReBAC)

| Prefix | Purpose | Access Level |
|--------|---------|--------------|
| `meta_` | System metadata (id, timestamps) | System |
| `ref_` | Foreign key references | Varies by target |
| `info_` | General display information | Basic |
| `config_` | Configuration/settings | Admin |
| `address_` | Address fields | Varies |
| `geo_` | Geographic/location data | Location access |
| `auth_` | Authentication data | System only |
| `personal_` | Personal/private info | Self + HR |
| `company_` | Employment/work info | Manager+ |
| `bank_` | Banking/deposit info | Payroll only |
| `pay_` | Compensation data | Payroll only |
| `tax_` | Tax/SSN info | Payroll + Compliance |
| `stripe_` | Payment processor refs | Billing only |
| `pref_` | User preferences | Self |
| `notif_` | Notification settings | Self |
| `audit_` | Audit trail data | Compliance |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TENANT BRANCH DATABASE                       │
│              (Each tenant = isolated Neon branch)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      CORE TABLES                            ││
│  │  core_users          - All people (employees, agents, etc.) ││
│  │  core_user_types     - Type definitions                     ││
│  │  core_user_languages - User language proficiencies          ││
│  │  core_user_banking   - Direct deposit (sensitive)           ││
│  │  core_user_compensation - Pay rates (sensitive)             ││
│  │  core_user_tax       - SSN & tax info (sensitive)           ││
│  │  core_locations      - Physical locations                   ││
│  │  core_departments    - Organizational units                 ││
│  │  core_divisions      - Large org units                      ││
│  │  core_lines_of_business - Product/service verticals         ││
│  │  core_user_assignments - User → org structure mapping       ││
│  │  core_skills         - Master skill definitions             ││
│  │  core_user_skills    - User skills with proficiency         ││
│  │  core_department_skills - Required skills per department    ││
│  │  core_password_history - Password reuse prevention          ││
│  │  core_custom_field_definitions - Custom field schema        ││
│  │  core_user_custom_fields - Custom field values              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      RBAC TABLES                            ││
│  │  rbac_roles          - Role definitions                     ││
│  │  rbac_permissions    - Permission definitions               ││
│  │  rbac_role_permissions - Role-permission mapping            ││
│  │  rbac_user_roles     - User-role assignments                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SETTINGS TABLES                          ││
│  │  settings_company    - Company-wide settings                ││
│  │  settings_user       - Per-user preferences                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    BILLING TABLES                           ││
│  │  billing_subscription - Plan & billing info                 ││
│  │  billing_compliance   - HIPAA/GDPR/SOC2 add-ons            ││
│  │  billing_addresses    - Billing address                     ││
│  │  billing_payment_methods - Stripe tokens                    ││
│  │  billing_invoices     - Invoice history                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    AUDIT TABLES                             ││
│  │  audit_logs          - All changes (HIPAA/SOC2)             ││
│  │  audit_sessions      - User sessions                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## CORE TABLES

### `core_user_types` - User Type Definitions

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `info_code` | varchar(30) | employee, agent, contractor, eor, vendor, system |
| `info_name` | varchar(100) | Display name |
| `info_description` | text | |
| `config_is_billable` | boolean | Counts toward subscription seats |
| `config_requires_w2` | boolean | Tax classification |
| `config_requires_1099` | boolean | |
| `config_is_system` | boolean | Can't be deleted |

---

### `core_users` - Central Directory

| Column | Type | Source (Registration) | Notes |
|--------|------|----------------------|-------|
| **meta_** | | | |
| `meta_id` | uuid | auto | PK |
| `meta_status` | varchar(20) | - | active, invited, suspended, terminated |
| `meta_created_at` | timestamptz | - | |
| `meta_updated_at` | timestamptz | - | |
| `meta_deleted_at` | timestamptz | - | Soft delete |
| **ref_** | | | |
| `ref_user_type_id` | uuid | - | FK → core_user_types |
| **auth_** | | | |
| `auth_password_hash` | varchar(255) | `password` | Argon2id |
| `auth_email_verified_at` | timestamptz | - | |
| `auth_last_login_at` | timestamptz | - | |
| `auth_mfa_enabled` | boolean | - | |
| `auth_mfa_secret` | varchar(255) | - | Encrypted |
| **personal_** | | | |
| `personal_first_name` | varchar(100) | `firstName` | |
| `personal_preferred_name` | varchar(100) | `preferredName` | Nickname/alias |
| `personal_last_name` | varchar(100) | `lastName` | |
| `personal_maiden_name` | varchar(100) | `maidenName` | |
| `personal_email` | varchar(255) | `email` | Personal email |
| `personal_phone` | varchar(30) | `phone` | |
| `personal_phone_country_code` | varchar(5) | computed | |
| `personal_avatar_url` | varchar(500) | `avatarFile` | S3/R2 |
| `personal_date_of_birth` | date | - | |
| `personal_gender` | varchar(20) | - | |
| **personal_address_** | | | |
| `personal_address_country_code` | varchar(2) | `personalCountry` | ISO |
| `personal_address_state_code` | varchar(10) | `personalState` | |
| `personal_address_city` | varchar(100) | `personalCity` | |
| `personal_address_line1` | varchar(255) | `personalAddress` | |
| `personal_address_line2` | varchar(255) | `personalAddress2` | |
| `personal_address_postal_code` | varchar(20) | `personalZip` | |
| **company_** | | | |
| `company_email` | varchar(255) | - | Work email (unique) |
| `company_phone` | varchar(30) | - | Work phone |
| `company_phone_ext` | varchar(10) | - | Extension |
| `company_employee_id` | varchar(50) | - | Internal employee number |
| `company_title` | varchar(100) | - | Job title |
| `company_hire_date` | date | - | |
| `company_termination_date` | date | - | |
| `company_avatar_url` | varchar(500) | - | Work photo (optional) |

---

### `core_user_languages` - User Languages (Multiple)

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `info_language_code` | varchar(10) | en, es, fr, zh, etc. |
| `info_proficiency` | varchar(20) | native, fluent, professional, basic |
| `config_is_primary` | boolean | Primary/preferred language |

---

### `core_user_banking` - Direct Deposit Info (Sensitive)

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_status` | varchar(20) | active, pending_verification, inactive |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `bank_account_type` | varchar(20) | checking, savings |
| `bank_name` | varchar(100) | |
| `bank_routing_number` | varchar(20) | Encrypted |
| `bank_account_number` | varchar(30) | Encrypted |
| `bank_account_holder_name` | varchar(255) | |
| `bank_verified_at` | timestamptz | |
| `config_is_primary` | boolean | Primary account |
| `config_percentage` | decimal(5,2) | Split deposit % (nullable) |
| `config_flat_amount` | decimal(10,2) | Fixed amount (nullable) |

---

### `core_user_compensation` - Pay Rates (Sensitive)

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `pay_type` | varchar(20) | hourly, salary, contract |
| `pay_rate` | decimal(12,2) | Encrypted |
| `pay_currency` | varchar(3) | USD, EUR, etc. |
| `pay_frequency` | varchar(20) | weekly, biweekly, semimonthly, monthly |
| `pay_effective_date` | date | |
| `pay_end_date` | date | Nullable for current |
| `config_overtime_eligible` | boolean | |
| `config_overtime_rate` | decimal(5,2) | Multiplier (1.5, 2.0) |
| `info_notes` | text | |

---

### `core_user_tax` - SSN & Tax Info (Sensitive)

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users, Unique |
| `tax_ssn` | varchar(50) | Encrypted (US) |
| `tax_id` | varchar(50) | Encrypted (International) |
| `tax_id_type` | varchar(20) | ssn, ein, itin, foreign |
| `tax_country` | varchar(2) | ISO country |
| `tax_w4_filing_status` | varchar(20) | single, married, head_of_household |
| `tax_w4_allowances` | int | |
| `tax_w4_additional_withholding` | decimal(10,2) | |
| `tax_w4_exempt` | boolean | |
| `tax_state_filing_status` | varchar(20) | |
| `tax_state_allowances` | int | |
| `tax_i9_verified_at` | timestamptz | |
| `tax_i9_document_type` | varchar(50) | |

---

### `core_locations` - Physical Locations

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | auto | PK |
| `meta_created_at` | timestamptz | - | |
| `meta_updated_at` | timestamptz | - | |
| `meta_deleted_at` | timestamptz | - | |
| `info_code` | varchar(20) | - | Short code (HQ, NYC-01) |
| `info_name` | varchar(100) | - | |
| `address_country_code` | varchar(2) | `companyCountry` | |
| `address_state_code` | varchar(10) | `companyState` | |
| `address_city` | varchar(100) | `companyCity` | |
| `address_line1` | varchar(255) | `companyAddress` | |
| `address_line2` | varchar(255) | `companyAddress2` | |
| `address_postal_code` | varchar(20) | `companyZip` | |
| `geo_timezone` | varchar(50) | - | America/New_York |
| `geo_latitude` | decimal(10,8) | - | Geofencing |
| `geo_longitude` | decimal(11,8) | - | |
| `geo_geofence_radius_m` | int | - | Meters |
| `config_is_headquarters` | boolean | - | Primary location |
| `config_is_active` | boolean | - | |

---

### `core_departments` - Organizational Units

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `meta_deleted_at` | timestamptz | |
| `ref_parent_id` | uuid | FK → self (hierarchy) |
| `ref_location_id` | uuid | FK → core_locations (nullable) |
| `ref_manager_user_id` | uuid | FK → core_users |
| `info_code` | varchar(20) | Short code |
| `info_name` | varchar(100) | |
| `info_description` | text | |
| `info_cost_center` | varchar(50) | Accounting code |
| `config_is_active` | boolean | |

---

### `core_divisions` - Large Organizational Units

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `meta_deleted_at` | timestamptz | |
| `info_code` | varchar(20) | DIV-001 |
| `info_name` | varchar(100) | e.g., "North America", "Enterprise" |
| `info_description` | text | |
| `info_color` | varchar(7) | Hex color for UI |
| `config_is_active` | boolean | |

---

### `core_lines_of_business` - Product/Service Verticals

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `meta_deleted_at` | timestamptz | |
| `ref_division_id` | uuid | FK → core_divisions (nullable) |
| `info_code` | varchar(20) | LOB-001 |
| `info_name` | varchar(100) | e.g., "Customer Support", "Sales" |
| `info_description` | text | |
| `info_color` | varchar(7) | Hex color for UI |
| `config_is_active` | boolean | |

---

### `core_user_assignments` - User → Location/Dept/Division/LOB

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `ref_location_id` | uuid | FK → core_locations (nullable) |
| `ref_department_id` | uuid | FK → core_departments (nullable) |
| `ref_division_id` | uuid | FK → core_divisions (nullable) |
| `ref_lob_id` | uuid | FK → core_lines_of_business (nullable) |
| `config_is_primary` | boolean | Primary assignment |
| `info_start_date` | date | |
| `info_end_date` | date | Nullable for current |

---

### `core_skills` - Master Skill Definitions

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `meta_deleted_at` | timestamptz | Soft delete |
| `info_code` | varchar(50) | Unique code (SKILL-001) |
| `info_name` | varchar(100) | Display name |
| `info_description` | text | |
| `info_category` | varchar(50) | language, technical, certification, soft_skill |
| `config_proficiency_scale` | varchar(20) | numeric (1-5), text (beginner/intermediate/expert) |
| `config_requires_expiration` | boolean | For certifications |
| `config_is_active` | boolean | |

---

### `core_user_skills` - User Skills with Proficiency

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `ref_skill_id` | uuid | FK → core_skills |
| `info_proficiency_numeric` | int | 1-5 scale (nullable) |
| `info_proficiency_text` | varchar(20) | beginner, intermediate, advanced, expert (nullable) |
| `info_certified_at` | date | When certification obtained |
| `info_expires_at` | date | Certification expiration (nullable) |
| `info_notes` | text | |
| `config_is_verified` | boolean | Verified by manager/HR |
| `ref_verified_by` | uuid | FK → core_users |
| `info_verified_at` | timestamptz | |

**Unique:** (`ref_user_id`, `ref_skill_id`)

---

### `core_department_skills` - Required Skills per Department

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `ref_department_id` | uuid | FK → core_departments |
| `ref_skill_id` | uuid | FK → core_skills |
| `info_min_proficiency_numeric` | int | Minimum required (1-5) |
| `info_min_proficiency_text` | varchar(20) | Minimum required (text) |
| `config_is_required` | boolean | Required vs preferred |

**Unique:** (`ref_department_id`, `ref_skill_id`)

*Note: LOB and Division skill requirements inherit from their departments.*

---

### `core_password_history` - Password Reuse Prevention

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `auth_password_hash` | varchar(255) | Argon2id hash |

**Index:** `ref_user_id`, `meta_created_at DESC`

*Check last N passwords on change. N configurable in settings_company.*

---

### `core_custom_field_definitions` - Custom Field Schema

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `meta_deleted_at` | timestamptz | Soft delete |
| `info_code` | varchar(50) | Unique field code |
| `info_name` | varchar(100) | Display name |
| `info_description` | text | |
| `info_field_type` | varchar(20) | text, number, date, boolean, select, multiselect |
| `info_options` | jsonb | For select/multiselect: ["Option 1", "Option 2"] |
| `info_entity_type` | varchar(50) | core_users, core_locations, etc. |
| `config_is_required` | boolean | |
| `config_is_searchable` | boolean | Index for search |
| `config_is_visible_to_user` | boolean | User can see their own value |
| `config_is_editable_by_user` | boolean | User can edit their own value |
| `config_display_order` | int | Sort order in UI |
| `config_validation_regex` | varchar(255) | Optional regex validation |

---

### `core_user_custom_fields` - Custom Field Values

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `ref_field_id` | uuid | FK → core_custom_field_definitions |
| `info_value_text` | text | For text fields |
| `info_value_number` | decimal(15,4) | For number fields |
| `info_value_date` | date | For date fields |
| `info_value_boolean` | boolean | For boolean fields |
| `info_value_json` | jsonb | For select/multiselect |

**Unique:** (`ref_user_id`, `ref_field_id`)

---

## RBAC TABLES

### `rbac_roles` - Role Definitions

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `meta_updated_at` | timestamptz | |
| `info_code` | varchar(50) | super_admin, admin, manager, employee |
| `info_name` | varchar(100) | Display name |
| `info_description` | text | |
| `config_hierarchy_level` | int | 1=highest (super_admin) |
| `config_is_system` | boolean | Can't delete/modify |
| `config_is_active` | boolean | |

---

### `rbac_permissions` - Permission Definitions

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `info_code` | varchar(100) | users.create, schedules.edit.own |
| `info_name` | varchar(100) | |
| `info_category` | varchar(50) | users, schedules, reports, settings |
| `info_description` | text | |
| `config_is_system` | boolean | |

---

### `rbac_role_permissions` - Role ↔ Permission

| Column | Type | Notes |
|--------|------|-------|
| `ref_role_id` | uuid | PK, FK → rbac_roles |
| `ref_permission_id` | uuid | PK, FK → rbac_permissions |
| `meta_created_at` | timestamptz | |

---

### `rbac_user_roles` - User ↔ Role Assignment

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `ref_role_id` | uuid | FK → rbac_roles |
| `ref_assigned_by` | uuid | FK → core_users |
| `info_scope_type` | varchar(20) | global, location, department, lob |
| `info_scope_id` | uuid | Nullable (null = global) |
| `info_assigned_at` | timestamptz | |
| `info_expires_at` | timestamptz | Nullable |

**Unique:** (`ref_user_id`, `ref_role_id`, `info_scope_type`, `info_scope_id`)

---

## SETTINGS TABLES

### `settings_company` - Company Settings

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | PK | Single row per tenant |
| `meta_created_at` | timestamptz | | |
| `meta_updated_at` | timestamptz | | |
| `info_company_name` | varchar(255) | `companyName` | |
| `info_company_slug` | varchar(30) | `companySlug` | |
| `info_tagline` | varchar(500) | `companyTagline` | |
| `info_industry` | varchar(50) | `industry` | |
| `info_company_size` | varchar(20) | `companySize` | |
| `info_website` | varchar(255) | `website` | |
| `info_tax_id` | varchar(100) | `taxId` | Encrypted |
| `brand_logo_url` | varchar(500) | `logoFile` | |
| `brand_header_image_url` | varchar(500) | `headerImageFile` | |
| `brand_use_custom_header` | boolean | `useCustomHeader` | |
| `config_default_timezone` | varchar(50) | - | |
| `config_date_format` | varchar(20) | - | MM/DD/YYYY |
| `config_time_format` | varchar(10) | - | 12h, 24h |
| `config_week_start` | varchar(10) | - | sunday, monday |
| `config_fiscal_year_start` | varchar(5) | - | 01-01 |
| **config_assignment_modes** | | | |
| `config_location_mode` | varchar(10) | - | single, multi, omni |
| `config_department_mode` | varchar(10) | - | single, multi, omni |
| `config_division_mode` | varchar(10) | - | single, multi, omni |
| `config_lob_mode` | varchar(10) | - | single, multi, omni |
| **config_compliance** | | | |
| `config_retention_days` | int | - | Days before hard delete (null = never, 30 default for non-HIPAA) |
| `config_password_history_count` | int | - | Number of passwords to remember (default 12) |
| `config_password_min_length` | int | - | Minimum password length (default 12) |
| `config_password_require_special` | boolean | - | Require special characters |
| `config_session_timeout_minutes` | int | - | Auto-logout after inactivity |
| `config_mfa_required` | boolean | - | Require MFA for all users |

---

### `settings_user` - User Preferences

| Column | Type | Notes |
|--------|------|-------|
| `ref_user_id` | uuid | PK, FK → core_users |
| `meta_updated_at` | timestamptz | |
| `pref_theme` | varchar(20) | light, dark, system |
| `pref_color_palette` | varchar(20) | corporate, lava, etc. |
| `pref_timezone` | varchar(50) | Override company default |
| `pref_date_format` | varchar(20) | |
| `pref_time_format` | varchar(10) | |
| `pref_language` | varchar(10) | en, es, fr |
| `notif_email` | boolean | |
| `notif_push` | boolean | |
| `notif_sms` | boolean | |

---

## BILLING TABLES

### `billing_subscription` - Plan Info

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | PK | Single row |
| `meta_status` | varchar(20) | - | trialing, active, past_due, cancelled |
| `meta_created_at` | timestamptz | | |
| `meta_updated_at` | timestamptz | | |
| `info_plan` | varchar(20) | `selectedPlan` | starter, professional, enterprise |
| `info_billing_cycle` | varchar(10) | `billingCycle` | monthly, annual |
| `info_estimated_seats` | varchar(20) | `estimatedEmployees` | |
| `info_price_per_seat` | decimal(10,2) | computed | |
| `info_trial_ends_at` | timestamptz | computed | |
| `info_current_period_start` | timestamptz | | |
| `info_current_period_end` | timestamptz | | |
| `stripe_customer_id` | varchar(100) | | |
| `stripe_subscription_id` | varchar(100) | | |

---

### `billing_compliance` - Add-ons

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | PK | |
| `meta_status` | varchar(20) | | active, pending |
| `meta_created_at` | timestamptz | | |
| `ref_subscription_id` | uuid | FK | |
| `info_compliance_type` | varchar(20) | `selectedCompliance[]` | hipaa, gdpr, soc2 |
| `info_price_per_seat` | decimal(10,2) | | |
| `info_baa_signed_at` | timestamptz | | HIPAA |
| `info_dpa_signed_at` | timestamptz | | GDPR |

---

### `billing_addresses` - Billing Address

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | PK | |
| `meta_created_at` | timestamptz | | |
| `meta_updated_at` | timestamptz | | |
| `config_same_as_company` | boolean | `sameAsCompany` | |
| `address_country_code` | varchar(2) | `billingCountry` | |
| `address_state_code` | varchar(10) | `billingState` | |
| `address_city` | varchar(100) | `billingCity` | |
| `address_line1` | varchar(255) | `billingAddress` | |
| `address_line2` | varchar(255) | `billingAddress2` | |
| `address_postal_code` | varchar(20) | `billingZip` | |

---

### `billing_payment_methods` - Stripe Tokens

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `meta_id` | uuid | PK | |
| `meta_created_at` | timestamptz | | |
| `stripe_payment_method_id` | varchar(100) | | |
| `info_card_brand` | varchar(20) | `cardType` | |
| `info_card_last4` | varchar(4) | | |
| `info_card_exp_month` | int | | |
| `info_card_exp_year` | int | | |
| `info_cardholder_name` | varchar(255) | `cardName` | |
| `config_is_default` | boolean | | |

---

### `billing_invoices` - Invoice History

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_status` | varchar(20) | draft, open, paid, void |
| `meta_created_at` | timestamptz | |
| `stripe_invoice_id` | varchar(100) | |
| `info_number` | varchar(50) | INV-2025-0001 |
| `info_amount` | decimal(10,2) | |
| `info_currency` | varchar(3) | USD |
| `info_period_start` | date | |
| `info_period_end` | date | |
| `info_due_date` | date | |
| `info_paid_at` | timestamptz | |
| `info_pdf_url` | varchar(500) | |

---

## AUDIT TABLES

### `audit_logs` - Change History (HIPAA/SOC2)

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | Immutable, indexed |
| `ref_user_id` | uuid | FK (nullable for system) |
| `ref_session_id` | uuid | FK → audit_sessions |
| `audit_action` | varchar(50) | create, update, delete, login, logout, export |
| `audit_resource_type` | varchar(50) | core_users, rbac_roles, etc. |
| `audit_resource_id` | uuid | |
| `audit_changes` | jsonb | { field: { old, new } } |
| `audit_ip_address` | inet | |
| `audit_user_agent` | text | |

**Indexes:** `meta_created_at`, `ref_user_id`, `audit_resource_type`, `audit_action`

---

### `audit_sessions` - User Sessions

| Column | Type | Notes |
|--------|------|-------|
| `meta_id` | uuid | PK |
| `meta_created_at` | timestamptz | |
| `ref_user_id` | uuid | FK → core_users |
| `auth_token_hash` | varchar(255) | |
| `audit_ip_address` | inet | |
| `audit_user_agent` | text | |
| `audit_device_fingerprint` | varchar(255) | |
| `info_last_active_at` | timestamptz | |
| `info_expires_at` | timestamptz | |
| `info_revoked_at` | timestamptz | |
| `info_revoked_reason` | varchar(100) | logout, timeout, admin, security |

---

## Table Prefix Summary

| Prefix | Purpose | Tables |
|--------|---------|--------|
| `core_` | Directory & org structure | users, user_types, user_languages, user_banking, user_compensation, user_tax, locations, departments, divisions, lines_of_business, user_assignments, skills, user_skills, department_skills, password_history, custom_field_definitions, user_custom_fields |
| `rbac_` | Permissions & roles | roles, permissions, role_permissions, user_roles |
| `settings_` | Configuration | company, user |
| `billing_` | Subscription & payments | subscription, compliance, addresses, payment_methods, invoices |
| `audit_` | Logging & sessions | logs, sessions |

---

## Design Decisions

| Question | Decision |
|----------|----------|
| **Soft Delete** | Hybrid: HIPAA tenants = soft delete forever; non-compliance = soft delete → hard delete after 30 days. Add `config_retention_days` to `settings_company`. |
| **Multi-assignment** | Tenant configurable per entity. Add `config_location_mode`, `config_department_mode`, `config_division_mode`, `config_lob_mode` to `settings_company` (values: single/multi/omni). |
| **Timezone** | All timestamps stored in UTC (`timestamptz`). Convert on display using user's `pref_timezone` or company's `config_default_timezone`. |
| **Password History** | Yes - add `core_password_history` table for compliance (prevent reuse of last N passwords). |
| **SSO/SAML** | Deferred - add `settings_sso` table when implementing enterprise features. |
| **Custom Fields** | Separate tables - `core_custom_field_definitions` (schema) + `core_user_custom_fields` (values). Only queried when needed. |
| **File Storage** | Cloudflare R2 for now. Will migrate to AWS S3 or pull from SSO providers (Google avatar) when implementing enterprise. |
| **Encryption at Rest** | App-level encryption for: `settings_company.info_tax_id`, `core_user_tax.tax_ssn`, `core_user_tax.tax_id`, `core_user_banking.bank_routing_number`, `core_user_banking.bank_account_number`, `core_user_compensation.pay_rate`, `core_users.auth_mfa_secret`. |

---

## Ready to implement!
.