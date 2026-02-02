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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { coreUsers } from './core';

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

  // Config columns
  config_hierarchy_level: integer('config_hierarchy_level').notNull(), // 1=highest (super_admin)
  config_is_system: boolean('config_is_system').notNull().default(false), // Can't delete/modify
  config_is_active: boolean('config_is_active').notNull().default(true),
}, (table) => [
  index('rbac_roles_info_code_idx').on(table.info_code),
  index('rbac_roles_config_hierarchy_level_idx').on(table.config_hierarchy_level),
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
// RELATIONS
// =============================================================================

export const rbacRolesRelations = relations(rbacRoles, ({ many }) => ({
  rolePermissions: many(rbacRolePermissions),
  userRoles: many(rbacUserRoles),
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
