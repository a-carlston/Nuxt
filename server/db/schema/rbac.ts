import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { coreUsers } from './core';

// =============================================================================
// RBAC_ROLES - Role Definitions
// =============================================================================

// =============================================================================
// RBAC_ROLE_GROUPS - Organizational Groups for Roles
// =============================================================================

export const rbacRoleGroups = pgTable('rbac_role_groups', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_name: varchar('info_name', { length: 100 }).notNull(),
  info_description: text('info_description'),

  // Config columns
  config_display_order: integer('config_display_order').notNull().default(0),
  config_is_collapsed: boolean('config_is_collapsed').notNull().default(true), // Default collapsed state
}, (table) => [
  index('rbac_role_groups_display_order_idx').on(table.config_display_order),
]);

// =============================================================================
// RBAC_ROLE_TAGS - Custom Tags for Role Categorization
// =============================================================================

export const rbacRoleTags = pgTable('rbac_role_tags', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_name: varchar('info_name', { length: 50 }).notNull(),
  info_color: varchar('info_color', { length: 7 }).notNull().default('#6366f1'), // Hex color code

  // Config columns
  config_display_order: integer('config_display_order').notNull().default(0),
}, (table) => [
  unique('rbac_role_tags_name_unique').on(table.info_name),
  index('rbac_role_tags_display_order_idx').on(table.config_display_order),
]);

// =============================================================================
// RBAC_ROLES - Role Definitions
// =============================================================================

export const rbacRoles = pgTable('rbac_roles', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_code: varchar('info_code', { length: 50 }).notNull().unique(), // super_admin, admin, manager, employee
  info_name: varchar('info_name', { length: 100 }).notNull(),
  info_description: text('info_description'),

  // Ref columns
  ref_group_id: uuid('ref_group_id')
    .references(() => rbacRoleGroups.meta_id, { onDelete: 'set null' }),

  // Config columns
  config_hierarchy_level: integer('config_hierarchy_level').notNull(), // 1=highest (super_admin)
  config_is_system: boolean('config_is_system').notNull().default(false), // Can't delete/modify
  config_is_active: boolean('config_is_active').notNull().default(true),
  config_sensitivity_access: varchar('config_sensitivity_access', { length: 20 }).notNull().default('basic'), // basic, personal, company, sensitive - max tier user can access
  config_display_order: integer('config_display_order').notNull().default(0), // Order within group
}, (table) => [
  index('rbac_roles_info_code_idx').on(table.info_code),
  index('rbac_roles_config_hierarchy_level_idx').on(table.config_hierarchy_level),
  index('rbac_roles_ref_group_id_idx').on(table.ref_group_id),
  index('rbac_roles_config_display_order_idx').on(table.config_display_order),
]);

// =============================================================================
// RBAC_PERMISSIONS - Permission Definitions
// =============================================================================

export const rbacPermissions = pgTable('rbac_permissions', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_code: varchar('info_code', { length: 100 }).notNull().unique(), // users.create, schedules.edit.own
  info_name: varchar('info_name', { length: 100 }).notNull(),
  info_category: varchar('info_category', { length: 50 }).notNull(), // users, schedules, reports, settings
  info_description: text('info_description'),

  // Config columns
  config_is_system: boolean('config_is_system').notNull().default(false),
}, (table) => [
  index('rbac_permissions_info_code_idx').on(table.info_code),
  index('rbac_permissions_info_category_idx').on(table.info_category),
]);

// =============================================================================
// RBAC_ROLE_TAG_ASSIGNMENTS - Role <-> Tag Junction Table
// =============================================================================

export const rbacRoleTagAssignments = pgTable('rbac_role_tag_assignments', {
  // Ref columns (composite primary key)
  ref_role_id: uuid('ref_role_id')
    .notNull()
    .references(() => rbacRoles.meta_id, { onDelete: 'cascade' }),
  ref_tag_id: uuid('ref_tag_id')
    .notNull()
    .references(() => rbacRoleTags.meta_id, { onDelete: 'cascade' }),

  // Meta columns
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.ref_role_id, table.ref_tag_id] }),
  index('rbac_role_tag_assignments_ref_role_id_idx').on(table.ref_role_id),
  index('rbac_role_tag_assignments_ref_tag_id_idx').on(table.ref_tag_id),
]);

// =============================================================================
// RBAC_ROLE_PERMISSIONS - Role <-> Permission (Composite PK)
// =============================================================================

export const rbacRolePermissions = pgTable('rbac_role_permissions', {
  // Ref columns (composite primary key)
  ref_role_id: uuid('ref_role_id')
    .notNull()
    .references(() => rbacRoles.meta_id, { onDelete: 'cascade' }),
  ref_permission_id: uuid('ref_permission_id')
    .notNull()
    .references(() => rbacPermissions.meta_id, { onDelete: 'cascade' }),

  // Meta columns
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.ref_role_id, table.ref_permission_id] }),
  index('rbac_role_permissions_ref_role_id_idx').on(table.ref_role_id),
  index('rbac_role_permissions_ref_permission_id_idx').on(table.ref_permission_id),
]);

// =============================================================================
// RBAC_USER_ROLES - User <-> Role Assignment
// =============================================================================

export const rbacUserRoles = pgTable('rbac_user_roles', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // Ref columns
  ref_user_id: uuid('ref_user_id')
    .notNull()
    .references(() => coreUsers.meta_id, { onDelete: 'cascade' }),
  ref_role_id: uuid('ref_role_id')
    .notNull()
    .references(() => rbacRoles.meta_id, { onDelete: 'cascade' }),
  ref_assigned_by: uuid('ref_assigned_by')
    .references(() => coreUsers.meta_id, { onDelete: 'set null' }),

  // Info columns
  info_scope_type: varchar('info_scope_type', { length: 20 }).notNull().default('global'), // global, location, department, lob
  info_scope_id: uuid('info_scope_id'), // Nullable (null = global)
  info_assigned_at: timestamp('info_assigned_at', { withTimezone: true }).notNull().defaultNow(),
  info_expires_at: timestamp('info_expires_at', { withTimezone: true }), // Nullable
}, (table) => [
  // Unique constraint: user + role + scope_type + scope_id
  unique('rbac_user_roles_unique').on(
    table.ref_user_id,
    table.ref_role_id,
    table.info_scope_type,
    table.info_scope_id
  ),
  index('rbac_user_roles_ref_user_id_idx').on(table.ref_user_id),
  index('rbac_user_roles_ref_role_id_idx').on(table.ref_role_id),
  index('rbac_user_roles_info_scope_type_idx').on(table.info_scope_type),
  index('rbac_user_roles_info_scope_id_idx').on(table.info_scope_id),
]);

// =============================================================================
// RBAC_USER_TAGS - User Tagging for Permission Rules
// =============================================================================

export const rbacUserTags = pgTable('rbac_user_tags', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // Ref columns
  ref_user_id: uuid('ref_user_id')
    .notNull()
    .references(() => coreUsers.meta_id, { onDelete: 'cascade' }),

  // Info columns
  info_tag: varchar('info_tag', { length: 50 }).notNull(), // e.g., 'contractor', 'temp', 'executive', 'remote'
  info_category: varchar('info_category', { length: 30 }).notNull(), // employment, access, compliance, org
}, (table) => [
  unique('rbac_user_tags_unique').on(table.ref_user_id, table.info_tag),
  index('rbac_user_tags_ref_user_id_idx').on(table.ref_user_id),
  index('rbac_user_tags_info_tag_idx').on(table.info_tag),
  index('rbac_user_tags_info_category_idx').on(table.info_category),
]);

// =============================================================================
// RBAC_TAG_PERMISSIONS - Tag-Based Permission Rules
// =============================================================================

export const rbacTagPermissions = pgTable('rbac_tag_permissions', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_tag: varchar('info_tag', { length: 50 }).notNull(), // Tag that grants/denies permission
  info_target_tags: text('info_target_tags').array(), // Users with these tags are affected (null = all users)

  // Ref columns
  ref_permission_id: uuid('ref_permission_id')
    .notNull()
    .references(() => rbacPermissions.meta_id, { onDelete: 'cascade' }),

  // Config columns
  config_effect: varchar('config_effect', { length: 10 }).notNull().default('grant'), // grant, deny
  config_priority: integer('config_priority').notNull().default(0), // Higher = evaluated later (deny typically higher)
}, (table) => [
  index('rbac_tag_permissions_info_tag_idx').on(table.info_tag),
  index('rbac_tag_permissions_ref_permission_id_idx').on(table.ref_permission_id),
  index('rbac_tag_permissions_config_effect_idx').on(table.config_effect),
]);

// =============================================================================
// RELATIONS
// =============================================================================

export const rbacRoleGroupsRelations = relations(rbacRoleGroups, ({ many }) => ({
  roles: many(rbacRoles),
}));

export const rbacRoleTagsRelations = relations(rbacRoleTags, ({ many }) => ({
  roleTagAssignments: many(rbacRoleTagAssignments),
}));

export const rbacRolesRelations = relations(rbacRoles, ({ one, many }) => ({
  group: one(rbacRoleGroups, {
    fields: [rbacRoles.ref_group_id],
    references: [rbacRoleGroups.meta_id],
  }),
  rolePermissions: many(rbacRolePermissions),
  userRoles: many(rbacUserRoles),
  roleTagAssignments: many(rbacRoleTagAssignments),
}));

export const rbacRoleTagAssignmentsRelations = relations(rbacRoleTagAssignments, ({ one }) => ({
  role: one(rbacRoles, {
    fields: [rbacRoleTagAssignments.ref_role_id],
    references: [rbacRoles.meta_id],
  }),
  tag: one(rbacRoleTags, {
    fields: [rbacRoleTagAssignments.ref_tag_id],
    references: [rbacRoleTags.meta_id],
  }),
}));

export const rbacPermissionsRelations = relations(rbacPermissions, ({ many }) => ({
  rolePermissions: many(rbacRolePermissions),
}));

export const rbacRolePermissionsRelations = relations(rbacRolePermissions, ({ one }) => ({
  role: one(rbacRoles, {
    fields: [rbacRolePermissions.ref_role_id],
    references: [rbacRoles.meta_id],
  }),
  permission: one(rbacPermissions, {
    fields: [rbacRolePermissions.ref_permission_id],
    references: [rbacPermissions.meta_id],
  }),
}));

export const rbacUserRolesRelations = relations(rbacUserRoles, ({ one }) => ({
  user: one(coreUsers, {
    fields: [rbacUserRoles.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  role: one(rbacRoles, {
    fields: [rbacUserRoles.ref_role_id],
    references: [rbacRoles.meta_id],
  }),
  assignedBy: one(coreUsers, {
    fields: [rbacUserRoles.ref_assigned_by],
    references: [coreUsers.meta_id],
  }),
}));

export const rbacUserTagsRelations = relations(rbacUserTags, ({ one }) => ({
  user: one(coreUsers, {
    fields: [rbacUserTags.ref_user_id],
    references: [coreUsers.meta_id],
  }),
}));

export const rbacTagPermissionsRelations = relations(rbacTagPermissions, ({ one }) => ({
  permission: one(rbacPermissions, {
    fields: [rbacTagPermissions.ref_permission_id],
    references: [rbacPermissions.meta_id],
  }),
}));

// =============================================================================
// RBAC_FIELD_SENSITIVITY - Field-level Data Sensitivity Configuration
// =============================================================================

export const rbacFieldSensitivity = pgTable('rbac_field_sensitivity', {
  // Meta columns
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Info columns
  info_table_name: varchar('info_table_name', { length: 100 }).notNull(), // e.g., 'core_users', 'core_user_compensation'
  info_field_name: varchar('info_field_name', { length: 100 }).notNull(), // e.g., 'personal_ssn', 'pay_rate'
  info_display_name: varchar('info_display_name', { length: 150 }), // Human-readable name
  info_description: text('info_description'), // Why this field is sensitive

  // Config columns - 4-tier sensitivity system
  config_sensitivity: varchar('config_sensitivity', { length: 20 }).notNull().default('basic'), // basic, personal, company, sensitive
  config_order: integer('config_order').notNull().default(0), // Display order for columns
  config_masking_type: varchar('config_masking_type', { length: 20 }).default('full'), // full, partial, last4, email, phone, date, currency
  config_is_system: boolean('config_is_system').notNull().default(false), // System fields can't be deleted
  config_min_sensitivity: varchar('config_min_sensitivity', { length: 20 }), // Enforced minimum tier

  // Ref columns
  ref_updated_by: uuid('ref_updated_by').references(() => coreUsers.meta_id, { onDelete: 'set null' }),
}, (table) => [
  unique('rbac_field_sensitivity_unique').on(table.info_table_name, table.info_field_name),
  index('rbac_field_sensitivity_table_idx').on(table.info_table_name),
  index('rbac_field_sensitivity_sensitivity_idx').on(table.config_sensitivity),
]);

export const rbacFieldSensitivityRelations = relations(rbacFieldSensitivity, ({ one }) => ({
  updatedBy: one(coreUsers, {
    fields: [rbacFieldSensitivity.ref_updated_by],
    references: [coreUsers.meta_id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type RbacRoleGroup = typeof rbacRoleGroups.$inferSelect;
export type NewRbacRoleGroup = typeof rbacRoleGroups.$inferInsert;

export type RbacRoleTag = typeof rbacRoleTags.$inferSelect;
export type NewRbacRoleTag = typeof rbacRoleTags.$inferInsert;

export type RbacRole = typeof rbacRoles.$inferSelect;
export type NewRbacRole = typeof rbacRoles.$inferInsert;

export type RbacRoleTagAssignment = typeof rbacRoleTagAssignments.$inferSelect;
export type NewRbacRoleTagAssignment = typeof rbacRoleTagAssignments.$inferInsert;

export type RbacPermission = typeof rbacPermissions.$inferSelect;
export type NewRbacPermission = typeof rbacPermissions.$inferInsert;

export type RbacFieldSensitivity = typeof rbacFieldSensitivity.$inferSelect;
export type NewRbacFieldSensitivity = typeof rbacFieldSensitivity.$inferInsert;
