import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  jsonb,
  inet,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { coreUsers } from './core';

// =============================================================================
// AUDIT TABLES
// =============================================================================

/**
 * audit_sessions - User Sessions
 *
 * Tracks user login sessions for security auditing and compliance.
 * Sessions can be revoked manually or automatically via timeout.
 */
export const auditSessions = pgTable(
  'audit_sessions',
  {
    // meta_ - System metadata
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

    // ref_ - Foreign key references
    ref_user_id: uuid('ref_user_id')
      .notNull()
      .references(() => coreUsers.meta_id),

    // auth_ - Authentication data
    auth_token_hash: varchar('auth_token_hash', { length: 255 }).notNull(),

    // audit_ - Audit trail data
    audit_ip_address: inet('audit_ip_address'),
    audit_user_agent: text('audit_user_agent'),
    audit_device_fingerprint: varchar('audit_device_fingerprint', {
      length: 255,
    }),

    // info_ - General display information
    info_last_active_at: timestamp('info_last_active_at', { withTimezone: true }),
    info_expires_at: timestamp('info_expires_at', { withTimezone: true }),
    info_revoked_at: timestamp('info_revoked_at', { withTimezone: true }),
    info_revoked_reason: varchar('info_revoked_reason', { length: 100 }), // logout, timeout, admin, security
  },
  (table) => [
    index('audit_sessions_ref_user_id_idx').on(table.ref_user_id),
    index('audit_sessions_info_expires_at_idx').on(table.info_expires_at),
  ]
);

/**
 * audit_logs - Change History (HIPAA/SOC2)
 *
 * Immutable audit log of all changes in the system.
 * Required for HIPAA/SOC2 compliance.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    // meta_ - System metadata
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

    // ref_ - Foreign key references
    ref_user_id: uuid('ref_user_id').references(() => coreUsers.meta_id), // Nullable for system actions
    ref_session_id: uuid('ref_session_id').references(
      () => auditSessions.meta_id
    ),

    // audit_ - Audit trail data
    audit_action: varchar('audit_action', { length: 50 }).notNull(), // create, update, delete, login, logout, export
    audit_resource_type: varchar('audit_resource_type', { length: 50 }).notNull(), // core_users, rbac_roles, etc.
    audit_resource_id: uuid('audit_resource_id'),
    audit_changes: jsonb('audit_changes'), // { field: { old, new } }
    audit_ip_address: inet('audit_ip_address'),
    audit_user_agent: text('audit_user_agent'),
  },
  (table) => [
    index('audit_logs_meta_created_at_idx').on(table.meta_created_at),
    index('audit_logs_ref_user_id_idx').on(table.ref_user_id),
    index('audit_logs_audit_resource_type_idx').on(table.audit_resource_type),
    index('audit_logs_audit_action_idx').on(table.audit_action),
  ]
);

// =============================================================================
// RELATIONS
// =============================================================================

/**
 * Relations for audit_sessions
 */
export const auditSessionsRelations = relations(auditSessions, ({ one, many }) => ({
  user: one(coreUsers, {
    fields: [auditSessions.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  logs: many(auditLogs),
}));

/**
 * Relations for audit_logs
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(coreUsers, {
    fields: [auditLogs.ref_user_id],
    references: [coreUsers.meta_id],
  }),
  session: one(auditSessions, {
    fields: [auditLogs.ref_session_id],
    references: [auditSessions.meta_id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type AuditSession = typeof auditSessions.$inferSelect;
export type NewAuditSession = typeof auditSessions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
