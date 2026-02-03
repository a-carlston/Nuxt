import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { coreUsers } from './core';

// =============================================================================
// SETTINGS_COMPANY - Company-wide Settings
// =============================================================================
// Single row per tenant containing all company configuration options
// Includes branding, localization, assignment modes, and compliance settings
// =============================================================================

export const settingsCompany = pgTable('settings_company', {
  // --------------------------------------------------------------------------
  // meta_ - System metadata
  // --------------------------------------------------------------------------
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // --------------------------------------------------------------------------
  // info_ - General display information
  // --------------------------------------------------------------------------
  info_company_name: varchar('info_company_name', { length: 255 }).notNull(),
  info_company_slug: varchar('info_company_slug', { length: 30 }).notNull().unique(),
  info_tagline: varchar('info_tagline', { length: 500 }),
  info_industry: varchar('info_industry', { length: 50 }),
  info_company_size: varchar('info_company_size', { length: 20 }),
  info_website: varchar('info_website', { length: 255 }),
  info_tax_id: varchar('info_tax_id', { length: 100 }), // Encrypted at app level

  // --------------------------------------------------------------------------
  // brand_ - Branding and visual identity
  // --------------------------------------------------------------------------
  brand_logo_url: varchar('brand_logo_url', { length: 500 }),
  brand_header_image_url: varchar('brand_header_image_url', { length: 500 }),
  brand_use_custom_header: boolean('brand_use_custom_header').notNull().default(false),

  // --------------------------------------------------------------------------
  // config_ - Configuration/settings (Admin level access)
  // --------------------------------------------------------------------------

  // Localization settings
  config_default_timezone: varchar('config_default_timezone', { length: 50 }).notNull().default('UTC'),
  config_date_format: varchar('config_date_format', { length: 20 }).notNull().default('MM/DD/YYYY'),
  config_time_format: varchar('config_time_format', { length: 10 }).notNull().default('12h'),
  config_week_start: varchar('config_week_start', { length: 10 }).notNull().default('sunday'),
  config_fiscal_year_start: varchar('config_fiscal_year_start', { length: 5 }).notNull().default('01-01'),

  // --------------------------------------------------------------------------
  // config_assignment_modes - User assignment flexibility
  // --------------------------------------------------------------------------
  // Values: 'single' | 'multi' | 'omni'
  // - single: User can only be assigned to one entity
  // - multi: User can be assigned to multiple entities
  // - omni: User has access to all entities (no assignment needed)
  // --------------------------------------------------------------------------
  config_location_mode: varchar('config_location_mode', { length: 10 }).notNull().default('single'),
  config_department_mode: varchar('config_department_mode', { length: 10 }).notNull().default('single'),
  config_division_mode: varchar('config_division_mode', { length: 10 }).notNull().default('single'),
  config_lob_mode: varchar('config_lob_mode', { length: 10 }).notNull().default('single'),

  // --------------------------------------------------------------------------
  // config_compliance - Security and compliance settings
  // --------------------------------------------------------------------------
  // Retention: Days before soft-deleted records are hard-deleted
  // - null = never delete (HIPAA requirement)
  // - Default 30 days for non-compliance tenants
  config_retention_days: integer('config_retention_days').default(30),

  // Password policy settings
  config_password_history_count: integer('config_password_history_count').notNull().default(12),
  config_password_min_length: integer('config_password_min_length').notNull().default(12),
  config_password_require_special: boolean('config_password_require_special').notNull().default(true),

  // Session and MFA settings
  config_session_timeout_minutes: integer('config_session_timeout_minutes').notNull().default(30),
  config_mfa_required: boolean('config_mfa_required').notNull().default(false),

  // --------------------------------------------------------------------------
  // config_column_labels - Company-level column label overrides
  // --------------------------------------------------------------------------
  // Structure: { [tableId]: { [columnId]: { label: string } } }
  // Example: { "directory": { "firstName": { "label": "Given Name" }, "lastName": { "label": "Family Name" } } }
  config_column_labels: jsonb('config_column_labels').$type<Record<string, Record<string, { label: string }>>>(),
});

// =============================================================================
// SETTINGS_USER - Per-user Preferences
// =============================================================================
// One row per user containing personal preferences that override company defaults
// Includes theme, localization overrides, and notification preferences
// =============================================================================

export const settingsUser = pgTable('settings_user', {
  // --------------------------------------------------------------------------
  // ref_ - Foreign key references (PK is the user reference itself)
  // --------------------------------------------------------------------------
  ref_user_id: uuid('ref_user_id')
    .primaryKey()
    .references(() => coreUsers.meta_id, { onDelete: 'cascade' }),

  // --------------------------------------------------------------------------
  // meta_ - System metadata
  // --------------------------------------------------------------------------
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // --------------------------------------------------------------------------
  // pref_ - User preferences (Self access level)
  // --------------------------------------------------------------------------
  pref_theme: varchar('pref_theme', { length: 20 }).notNull().default('system'), // light, dark, system
  pref_color_palette: varchar('pref_color_palette', { length: 20 }).notNull().default('corporate'), // corporate, lava, etc.
  pref_timezone: varchar('pref_timezone', { length: 50 }), // Override company default
  pref_date_format: varchar('pref_date_format', { length: 20 }), // Override company default
  pref_time_format: varchar('pref_time_format', { length: 10 }), // Override company default
  pref_language: varchar('pref_language', { length: 10 }).notNull().default('en'), // en, es, fr, etc.

  // --------------------------------------------------------------------------
  // notif_ - Notification settings (Self access level)
  // --------------------------------------------------------------------------
  notif_email: boolean('notif_email').notNull().default(true),
  notif_push: boolean('notif_push').notNull().default(true),
  notif_sms: boolean('notif_sms').notNull().default(false),

  // --------------------------------------------------------------------------
  // ui_ - User interface preferences (Self access level)
  // --------------------------------------------------------------------------
  ui_directory_columns: jsonb('ui_directory_columns'), // { visible: string[], order: string[] }
});

// =============================================================================
// RELATIONS
// =============================================================================

export const settingsUserRelations = relations(settingsUser, ({ one }) => ({
  user: one(coreUsers, {
    fields: [settingsUser.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SettingsCompany = typeof settingsCompany.$inferSelect;
export type NewSettingsCompany = typeof settingsCompany.$inferInsert;

export type SettingsUser = typeof settingsUser.$inferSelect;
export type NewSettingsUser = typeof settingsUser.$inferInsert;

// =============================================================================
// ASSIGNMENT MODE TYPES
// =============================================================================

export type AssignmentMode = 'single' | 'multi' | 'omni';

export interface AssignmentModes {
  location: AssignmentMode;
  department: AssignmentMode;
  division: AssignmentMode;
  lob: AssignmentMode;
}

// =============================================================================
// COLUMN LABEL OVERRIDE TYPES
// =============================================================================

export interface ColumnLabelOverride {
  label: string;
}

export interface TableColumnLabels {
  [columnId: string]: ColumnLabelOverride;
}

export interface CompanyColumnLabels {
  [tableId: string]: TableColumnLabels;
}
