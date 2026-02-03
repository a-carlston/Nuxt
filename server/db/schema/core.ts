import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================================================
// CORE_USER_TYPES - User Type Definitions
// ============================================================================

export const coreUserTypes = pgTable('core_user_types', {
  // meta_
  meta_id: uuid('meta_id').defaultRandom().primaryKey(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

  // info_
  info_code: varchar('info_code', { length: 30 }).notNull().unique(),
  info_name: varchar('info_name', { length: 100 }).notNull(),
  info_description: text('info_description'),

  // config_
  config_is_billable: boolean('config_is_billable').default(true).notNull(),
  config_requires_w2: boolean('config_requires_w2').default(false).notNull(),
  config_requires_1099: boolean('config_requires_1099').default(false).notNull(),
  config_is_system: boolean('config_is_system').default(false).notNull(),
});

// ============================================================================
// CORE_USERS - Central Directory
// ============================================================================

export const coreUsers = pgTable(
  'core_users',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_status: varchar('meta_status', { length: 20 }).default('invited').notNull(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // ref_
    ref_user_type_id: uuid('ref_user_type_id').references(() => coreUserTypes.meta_id),

    // auth_
    auth_password_hash: varchar('auth_password_hash', { length: 255 }),
    auth_email_verified_at: timestamp('auth_email_verified_at', { withTimezone: true }),
    auth_last_login_at: timestamp('auth_last_login_at', { withTimezone: true }),
    auth_mfa_enabled: boolean('auth_mfa_enabled').default(false).notNull(),
    auth_mfa_secret: varchar('auth_mfa_secret', { length: 255 }), // Encrypted at app level
    auth_onboarding_completed_at: timestamp('auth_onboarding_completed_at', { withTimezone: true }),

    // personal_
    personal_first_name: varchar('personal_first_name', { length: 100 }).notNull(),
    personal_preferred_name: varchar('personal_preferred_name', { length: 100 }),
    personal_last_name: varchar('personal_last_name', { length: 100 }).notNull(),
    personal_maiden_name: varchar('personal_maiden_name', { length: 100 }),
    personal_email: varchar('personal_email', { length: 255 }).notNull(),
    personal_phone: varchar('personal_phone', { length: 30 }),
    personal_phone_country_code: varchar('personal_phone_country_code', { length: 5 }),
    personal_avatar_url: varchar('personal_avatar_url', { length: 500 }),
    personal_date_of_birth: date('personal_date_of_birth'),
    personal_gender: varchar('personal_gender', { length: 20 }),
    personal_nationality: varchar('personal_nationality', { length: 50 }),
    personal_ssn: varchar('personal_ssn', { length: 50 }), // Encrypted at app level

    // personal_address_
    personal_address_country_code: varchar('personal_address_country_code', { length: 2 }),
    personal_address_state_code: varchar('personal_address_state_code', { length: 10 }),
    personal_address_city: varchar('personal_address_city', { length: 100 }),
    personal_address_line1: varchar('personal_address_line1', { length: 255 }),
    personal_address_line2: varchar('personal_address_line2', { length: 255 }),
    personal_address_postal_code: varchar('personal_address_postal_code', { length: 20 }),

    // emergency_contact_
    emergency_contact_name: varchar('emergency_contact_name', { length: 100 }),
    emergency_contact_relationship: varchar('emergency_contact_relationship', { length: 50 }),
    emergency_contact_phone: varchar('emergency_contact_phone', { length: 30 }),
    emergency_contact_email: varchar('emergency_contact_email', { length: 255 }),
    emergency_contact_address: text('emergency_contact_address'),

    // company_
    company_email: varchar('company_email', { length: 255 }).unique(),
    company_phone: varchar('company_phone', { length: 30 }),
    company_phone_ext: varchar('company_phone_ext', { length: 10 }),
    company_employee_id: varchar('company_employee_id', { length: 50 }),
    company_title: varchar('company_title', { length: 100 }),
    company_department: varchar('company_department', { length: 100 }),
    company_division: varchar('company_division', { length: 100 }),
    company_location: varchar('company_location', { length: 100 }),
    company_start_date: date('company_start_date'),
    company_employment_type: varchar('company_employment_type', { length: 30 }),
    company_hire_date: date('company_hire_date'),
    company_termination_date: date('company_termination_date'),
    company_avatar_url: varchar('company_avatar_url', { length: 500 }),
  },
  (table) => [
    index('idx_core_users_personal_email').on(table.personal_email),
    index('idx_core_users_meta_status').on(table.meta_status),
    index('idx_core_users_ref_user_type_id').on(table.ref_user_type_id),
  ]
);

// ============================================================================
// CORE_USER_LANGUAGES - User Languages (Multiple)
// ============================================================================

export const coreUserLanguages = pgTable(
  'core_user_languages',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // info_
    info_language_code: varchar('info_language_code', { length: 10 }).notNull(),
    info_proficiency: varchar('info_proficiency', { length: 20 }).notNull(),

    // config_
    config_is_primary: boolean('config_is_primary').default(false).notNull(),
  },
  (table) => [
    index('idx_core_user_languages_ref_user_id').on(table.ref_user_id),
  ]
);

// ============================================================================
// CORE_USER_BANKING - Direct Deposit Info (Sensitive)
// ============================================================================

export const coreUserBanking = pgTable(
  'core_user_banking',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_status: varchar('meta_status', { length: 20 }).default('pending_verification').notNull(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // bank_
    bank_account_type: varchar('bank_account_type', { length: 20 }).notNull(),
    bank_name: varchar('bank_name', { length: 100 }),
    bank_routing_number: varchar('bank_routing_number', { length: 20 }).notNull(), // Encrypted at app level
    bank_account_number: varchar('bank_account_number', { length: 30 }).notNull(), // Encrypted at app level
    bank_account_holder_name: varchar('bank_account_holder_name', { length: 255 }).notNull(),
    bank_verified_at: timestamp('bank_verified_at', { withTimezone: true }),

    // config_
    config_is_primary: boolean('config_is_primary').default(true).notNull(),
    config_percentage: decimal('config_percentage', { precision: 5, scale: 2 }),
    config_flat_amount: decimal('config_flat_amount', { precision: 10, scale: 2 }),
  },
  (table) => [
    index('idx_core_user_banking_ref_user_id').on(table.ref_user_id),
  ]
);

// ============================================================================
// CORE_USER_COMPENSATION - Pay Rates (Sensitive)
// ============================================================================

export const coreUserCompensation = pgTable(
  'core_user_compensation',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // pay_
    pay_type: varchar('pay_type', { length: 20 }).notNull(),
    pay_rate: decimal('pay_rate', { precision: 12, scale: 2 }).notNull(), // Encrypted at app level
    pay_currency: varchar('pay_currency', { length: 3 }).default('USD').notNull(),
    pay_frequency: varchar('pay_frequency', { length: 20 }).notNull(),
    pay_effective_date: date('pay_effective_date').notNull(),
    pay_end_date: date('pay_end_date'),

    // config_
    config_overtime_eligible: boolean('config_overtime_eligible').default(false).notNull(),
    config_overtime_rate: decimal('config_overtime_rate', { precision: 5, scale: 2 }),

    // info_
    info_notes: text('info_notes'),
  },
  (table) => [
    index('idx_core_user_compensation_ref_user_id').on(table.ref_user_id),
    index('idx_core_user_compensation_pay_effective_date').on(table.pay_effective_date),
  ]
);

// ============================================================================
// CORE_USER_TAX - SSN & Tax Info (Sensitive)
// ============================================================================

export const coreUserTax = pgTable(
  'core_user_tax',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    // tax_
    tax_ssn: varchar('tax_ssn', { length: 50 }), // Encrypted at app level (US)
    tax_id: varchar('tax_id', { length: 50 }), // Encrypted at app level (International)
    tax_id_type: varchar('tax_id_type', { length: 20 }),
    tax_country: varchar('tax_country', { length: 2 }),
    tax_w4_filing_status: varchar('tax_w4_filing_status', { length: 20 }),
    tax_w4_allowances: integer('tax_w4_allowances'),
    tax_w4_additional_withholding: decimal('tax_w4_additional_withholding', { precision: 10, scale: 2 }),
    tax_w4_exempt: boolean('tax_w4_exempt').default(false),
    tax_state_filing_status: varchar('tax_state_filing_status', { length: 20 }),
    tax_state_allowances: integer('tax_state_allowances'),
    tax_i9_verified_at: timestamp('tax_i9_verified_at', { withTimezone: true }),
    tax_i9_document_type: varchar('tax_i9_document_type', { length: 50 }),
  },
  (table) => [
    index('idx_core_user_tax_ref_user_id').on(table.ref_user_id),
  ]
);

// ============================================================================
// CORE_LOCATIONS - Physical Locations
// ============================================================================

export const coreLocations = pgTable(
  'core_locations',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // info_
    info_code: varchar('info_code', { length: 20 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),

    // address_
    address_country_code: varchar('address_country_code', { length: 2 }),
    address_state_code: varchar('address_state_code', { length: 10 }),
    address_city: varchar('address_city', { length: 100 }),
    address_line1: varchar('address_line1', { length: 255 }),
    address_line2: varchar('address_line2', { length: 255 }),
    address_postal_code: varchar('address_postal_code', { length: 20 }),

    // geo_
    geo_timezone: varchar('geo_timezone', { length: 50 }),
    geo_latitude: decimal('geo_latitude', { precision: 10, scale: 8 }),
    geo_longitude: decimal('geo_longitude', { precision: 11, scale: 8 }),
    geo_geofence_radius_m: integer('geo_geofence_radius_m'),

    // config_
    config_is_headquarters: boolean('config_is_headquarters').default(false).notNull(),
    config_is_active: boolean('config_is_active').default(true).notNull(),
  },
  (table) => [
    index('idx_core_locations_info_code').on(table.info_code),
    index('idx_core_locations_config_is_active').on(table.config_is_active),
  ]
);

// ============================================================================
// CORE_DIVISIONS - Large Organizational Units
// ============================================================================

export const coreDivisions = pgTable(
  'core_divisions',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // info_
    info_code: varchar('info_code', { length: 20 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),
    info_color: varchar('info_color', { length: 7 }),

    // config_
    config_is_active: boolean('config_is_active').default(true).notNull(),
  },
  (table) => [
    index('idx_core_divisions_info_code').on(table.info_code),
    index('idx_core_divisions_config_is_active').on(table.config_is_active),
  ]
);

// ============================================================================
// CORE_DEPARTMENTS - Organizational Units
// ============================================================================

export const coreDepartments = pgTable(
  'core_departments',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // ref_
    ref_parent_id: uuid('ref_parent_id'), // Self-reference, defined below
    ref_location_id: uuid('ref_location_id').references(() => coreLocations.meta_id),
    ref_manager_user_id: uuid('ref_manager_user_id').references(() => coreUsers.meta_id),

    // info_
    info_code: varchar('info_code', { length: 20 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),
    info_cost_center: varchar('info_cost_center', { length: 50 }),

    // config_
    config_is_active: boolean('config_is_active').default(true).notNull(),
  },
  (table) => [
    index('idx_core_departments_info_code').on(table.info_code),
    index('idx_core_departments_ref_parent_id').on(table.ref_parent_id),
    index('idx_core_departments_ref_location_id').on(table.ref_location_id),
    index('idx_core_departments_config_is_active').on(table.config_is_active),
  ]
);

// ============================================================================
// CORE_LINES_OF_BUSINESS - Product/Service Verticals
// ============================================================================

export const coreLinesOfBusiness = pgTable(
  'core_lines_of_business',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // ref_
    ref_division_id: uuid('ref_division_id').references(() => coreDivisions.meta_id),

    // info_
    info_code: varchar('info_code', { length: 20 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),
    info_color: varchar('info_color', { length: 7 }),

    // config_
    config_is_active: boolean('config_is_active').default(true).notNull(),
  },
  (table) => [
    index('idx_core_lines_of_business_info_code').on(table.info_code),
    index('idx_core_lines_of_business_ref_division_id').on(table.ref_division_id),
    index('idx_core_lines_of_business_config_is_active').on(table.config_is_active),
  ]
);

// ============================================================================
// CORE_USER_ASSIGNMENTS - User -> Location/Dept/Division/LOB
// ============================================================================

export const coreUserAssignments = pgTable(
  'core_user_assignments',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),
    ref_location_id: uuid('ref_location_id').references(() => coreLocations.meta_id),
    ref_department_id: uuid('ref_department_id').references(() => coreDepartments.meta_id),
    ref_division_id: uuid('ref_division_id').references(() => coreDivisions.meta_id),
    ref_lob_id: uuid('ref_lob_id').references(() => coreLinesOfBusiness.meta_id),

    // config_
    config_is_primary: boolean('config_is_primary').default(false).notNull(),

    // info_
    info_start_date: date('info_start_date'),
    info_end_date: date('info_end_date'),
  },
  (table) => [
    index('idx_core_user_assignments_ref_user_id').on(table.ref_user_id),
    index('idx_core_user_assignments_ref_location_id').on(table.ref_location_id),
    index('idx_core_user_assignments_ref_department_id').on(table.ref_department_id),
    index('idx_core_user_assignments_ref_division_id').on(table.ref_division_id),
    index('idx_core_user_assignments_ref_lob_id').on(table.ref_lob_id),
  ]
);

// ============================================================================
// CORE_SKILLS - Master Skill Definitions
// ============================================================================

export const coreSkills = pgTable(
  'core_skills',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // info_
    info_code: varchar('info_code', { length: 50 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),
    info_category: varchar('info_category', { length: 50 }),

    // config_
    config_proficiency_scale: varchar('config_proficiency_scale', { length: 20 }),
    config_requires_expiration: boolean('config_requires_expiration').default(false).notNull(),
    config_is_active: boolean('config_is_active').default(true).notNull(),
  },
  (table) => [
    index('idx_core_skills_info_code').on(table.info_code),
    index('idx_core_skills_info_category').on(table.info_category),
    index('idx_core_skills_config_is_active').on(table.config_is_active),
  ]
);

// ============================================================================
// CORE_USER_SKILLS - User Skills with Proficiency
// ============================================================================

export const coreUserSkills = pgTable(
  'core_user_skills',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),
    ref_skill_id: uuid('ref_skill_id')
      .references(() => coreSkills.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // info_
    info_proficiency_numeric: integer('info_proficiency_numeric'),
    info_proficiency_text: varchar('info_proficiency_text', { length: 20 }),
    info_certified_at: date('info_certified_at'),
    info_expires_at: date('info_expires_at'),
    info_notes: text('info_notes'),

    // config_
    config_is_verified: boolean('config_is_verified').default(false).notNull(),

    // ref_ for verified_by
    ref_verified_by: uuid('ref_verified_by').references(() => coreUsers.meta_id),

    // info_ for verified_at
    info_verified_at: timestamp('info_verified_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_core_user_skills_user_skill').on(table.ref_user_id, table.ref_skill_id),
    index('idx_core_user_skills_ref_user_id').on(table.ref_user_id),
    index('idx_core_user_skills_ref_skill_id').on(table.ref_skill_id),
  ]
);

// ============================================================================
// CORE_DEPARTMENT_SKILLS - Required Skills per Department
// ============================================================================

export const coreDepartmentSkills = pgTable(
  'core_department_skills',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_department_id: uuid('ref_department_id')
      .references(() => coreDepartments.meta_id, { onDelete: 'cascade' })
      .notNull(),
    ref_skill_id: uuid('ref_skill_id')
      .references(() => coreSkills.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // info_
    info_min_proficiency_numeric: integer('info_min_proficiency_numeric'),
    info_min_proficiency_text: varchar('info_min_proficiency_text', { length: 20 }),

    // config_
    config_is_required: boolean('config_is_required').default(true).notNull(),
  },
  (table) => [
    unique('uq_core_department_skills_dept_skill').on(table.ref_department_id, table.ref_skill_id),
    index('idx_core_department_skills_ref_department_id').on(table.ref_department_id),
    index('idx_core_department_skills_ref_skill_id').on(table.ref_skill_id),
  ]
);

// ============================================================================
// CORE_PASSWORD_HISTORY - Password Reuse Prevention
// ============================================================================

export const corePasswordHistory = pgTable(
  'core_password_history',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // auth_
    auth_password_hash: varchar('auth_password_hash', { length: 255 }).notNull(),
  },
  (table) => [
    index('idx_core_password_history_ref_user_id_created').on(table.ref_user_id, table.meta_created_at),
  ]
);

// ============================================================================
// CORE_CUSTOM_FIELD_DEFINITIONS - Custom Field Schema
// ============================================================================

export const coreCustomFieldDefinitions = pgTable(
  'core_custom_field_definitions',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),
    meta_deleted_at: timestamp('meta_deleted_at', { withTimezone: true }),

    // info_
    info_code: varchar('info_code', { length: 50 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),
    info_field_type: varchar('info_field_type', { length: 20 }).notNull(),
    info_options: jsonb('info_options'),
    info_entity_type: varchar('info_entity_type', { length: 50 }).notNull(),

    // config_
    config_is_required: boolean('config_is_required').default(false).notNull(),
    config_is_searchable: boolean('config_is_searchable').default(false).notNull(),
    config_is_visible_to_user: boolean('config_is_visible_to_user').default(true).notNull(),
    config_is_editable_by_user: boolean('config_is_editable_by_user').default(false).notNull(),
    config_display_order: integer('config_display_order').default(0).notNull(),
    config_validation_regex: varchar('config_validation_regex', { length: 255 }),
  },
  (table) => [
    index('idx_core_custom_field_definitions_info_code').on(table.info_code),
    index('idx_core_custom_field_definitions_info_entity_type').on(table.info_entity_type),
  ]
);

// ============================================================================
// CORE_USER_CUSTOM_FIELDS - Custom Field Values
// ============================================================================

export const coreUserCustomFields = pgTable(
  'core_user_custom_fields',
  {
    // meta_
    meta_id: uuid('meta_id').defaultRandom().primaryKey(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).defaultNow().notNull(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).defaultNow().notNull(),

    // ref_
    ref_user_id: uuid('ref_user_id')
      .references(() => coreUsers.meta_id, { onDelete: 'cascade' })
      .notNull(),
    ref_field_id: uuid('ref_field_id')
      .references(() => coreCustomFieldDefinitions.meta_id, { onDelete: 'cascade' })
      .notNull(),

    // info_
    info_value_text: text('info_value_text'),
    info_value_number: decimal('info_value_number', { precision: 15, scale: 4 }),
    info_value_date: date('info_value_date'),
    info_value_boolean: boolean('info_value_boolean'),
    info_value_json: jsonb('info_value_json'),
  },
  (table) => [
    unique('uq_core_user_custom_fields_user_field').on(table.ref_user_id, table.ref_field_id),
    index('idx_core_user_custom_fields_ref_user_id').on(table.ref_user_id),
    index('idx_core_user_custom_fields_ref_field_id').on(table.ref_field_id),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

// User Types Relations
export const coreUserTypesRelations = relations(coreUserTypes, ({ many }) => ({
  users: many(coreUsers),
}));

// Users Relations
export const coreUsersRelations = relations(coreUsers, ({ one, many }) => ({
  userType: one(coreUserTypes, {
    fields: [coreUsers.ref_user_type_id],
    references: [coreUserTypes.meta_id],
  }),
  languages: many(coreUserLanguages),
  bankingAccounts: many(coreUserBanking),
  compensationRecords: many(coreUserCompensation),
  taxInfo: one(coreUserTax, {
    fields: [coreUsers.meta_id],
    references: [coreUserTax.ref_user_id],
  }),
  assignments: many(coreUserAssignments),
  skills: many(coreUserSkills),
  customFields: many(coreUserCustomFields),
  passwordHistory: many(corePasswordHistory),
  managedDepartments: many(coreDepartments),
}));

// User Languages Relations
export const coreUserLanguagesRelations = relations(coreUserLanguages, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserLanguages.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// User Banking Relations
export const coreUserBankingRelations = relations(coreUserBanking, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserBanking.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// User Compensation Relations
export const coreUserCompensationRelations = relations(coreUserCompensation, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserCompensation.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// User Tax Relations
export const coreUserTaxRelations = relations(coreUserTax, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserTax.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// Locations Relations
export const coreLocationsRelations = relations(coreLocations, ({ many }) => ({
  departments: many(coreDepartments),
  userAssignments: many(coreUserAssignments),
}));

// Divisions Relations
export const coreDivisionsRelations = relations(coreDivisions, ({ many }) => ({
  linesOfBusiness: many(coreLinesOfBusiness),
  userAssignments: many(coreUserAssignments),
}));

// Departments Relations
export const coreDepartmentsRelations = relations(coreDepartments, ({ one, many }) => ({
  parent: one(coreDepartments, {
    fields: [coreDepartments.ref_parent_id],
    references: [coreDepartments.meta_id],
    relationName: 'parentChild',
  }),
  children: many(coreDepartments, { relationName: 'parentChild' }),
  location: one(coreLocations, {
    fields: [coreDepartments.ref_location_id],
    references: [coreLocations.meta_id],
  }),
  manager: one(coreUsers, {
    fields: [coreDepartments.ref_manager_user_id],
    references: [coreUsers.meta_id],
  }),
  userAssignments: many(coreUserAssignments),
  requiredSkills: many(coreDepartmentSkills),
}));

// Lines of Business Relations
export const coreLinesOfBusinessRelations = relations(coreLinesOfBusiness, ({ one, many }) => ({
  division: one(coreDivisions, {
    fields: [coreLinesOfBusiness.ref_division_id],
    references: [coreDivisions.meta_id],
  }),
  userAssignments: many(coreUserAssignments),
}));

// User Assignments Relations
export const coreUserAssignmentsRelations = relations(coreUserAssignments, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserAssignments.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  location: one(coreLocations, {
    fields: [coreUserAssignments.ref_location_id],
    references: [coreLocations.meta_id],
  }),
  department: one(coreDepartments, {
    fields: [coreUserAssignments.ref_department_id],
    references: [coreDepartments.meta_id],
  }),
  division: one(coreDivisions, {
    fields: [coreUserAssignments.ref_division_id],
    references: [coreDivisions.meta_id],
  }),
  lineOfBusiness: one(coreLinesOfBusiness, {
    fields: [coreUserAssignments.ref_lob_id],
    references: [coreLinesOfBusiness.meta_id],
  }),
}));

// Skills Relations
export const coreSkillsRelations = relations(coreSkills, ({ many }) => ({
  userSkills: many(coreUserSkills),
  departmentSkills: many(coreDepartmentSkills),
}));

// User Skills Relations
export const coreUserSkillsRelations = relations(coreUserSkills, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserSkills.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  skill: one(coreSkills, {
    fields: [coreUserSkills.ref_skill_id],
    references: [coreSkills.meta_id],
  }),
  verifiedBy: one(coreUsers, {
    fields: [coreUserSkills.ref_verified_by],
    references: [coreUsers.meta_id],
  }),
}));

// Department Skills Relations
export const coreDepartmentSkillsRelations = relations(coreDepartmentSkills, ({ one }) => ({
  department: one(coreDepartments, {
    fields: [coreDepartmentSkills.ref_department_id],
    references: [coreDepartments.meta_id],
  }),
  skill: one(coreSkills, {
    fields: [coreDepartmentSkills.ref_skill_id],
    references: [coreSkills.meta_id],
  }),
}));

// Password History Relations
export const corePasswordHistoryRelations = relations(corePasswordHistory, ({ one }) => ({
  user: one(coreUsers, {
    fields: [corePasswordHistory.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// Custom Field Definitions Relations
export const coreCustomFieldDefinitionsRelations = relations(coreCustomFieldDefinitions, ({ many }) => ({
  values: many(coreUserCustomFields),
}));

// User Custom Fields Relations
export const coreUserCustomFieldsRelations = relations(coreUserCustomFields, ({ one }) => ({
  user: one(coreUsers, {
    fields: [coreUserCustomFields.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  fieldDefinition: one(coreCustomFieldDefinitions, {
    fields: [coreUserCustomFields.ref_field_id],
    references: [coreCustomFieldDefinitions.meta_id],
  }),
}));
