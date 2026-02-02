import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// =============================================================================
// PARENT DATABASE SCHEMA
// =============================================================================
// This schema is for the MAIN database only (control plane).
// It tracks tenants, billing, analytics, and platform-level data.
// All tenant-specific data (users, settings, etc.) lives in tenant branches.
// =============================================================================

// =============================================================================
// PARENT_TENANTS - Master tenant registry
// =============================================================================
export const parentTenants = pgTable(
  'parent_tenants',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull().default('active'), // active, suspended, cancelled, deleted

    // Company identification
    info_company_name: varchar('info_company_name', { length: 255 }).notNull(),
    info_company_slug: varchar('info_company_slug', { length: 30 }).notNull().unique(),
    info_industry: varchar('info_industry', { length: 50 }),
    info_company_size: varchar('info_company_size', { length: 20 }),
    info_website: varchar('info_website', { length: 255 }),
    info_logo_url: varchar('info_logo_url', { length: 500 }),

    // Neon branch info
    neon_branch_id: varchar('neon_branch_id', { length: 100 }),
    neon_branch_name: varchar('neon_branch_name', { length: 100 }),
    neon_host: varchar('neon_host', { length: 255 }),
    neon_database_name: varchar('neon_database_name', { length: 100 }).default('neondb'),
    connection_string: text('connection_string'), // Encrypted in production

    // Primary contact/owner
    owner_email: varchar('owner_email', { length: 255 }).notNull(),
    owner_first_name: varchar('owner_first_name', { length: 100 }).notNull(),
    owner_last_name: varchar('owner_last_name', { length: 100 }).notNull(),
    owner_phone: varchar('owner_phone', { length: 30 }),

    // Onboarding tracking
    onboarding_completed_at: timestamp('onboarding_completed_at', { withTimezone: true }),
    onboarding_step: varchar('onboarding_step', { length: 50 }).default('registered'),

    // Feature flags / tier limits
    config_max_users: integer('config_max_users'),
    config_max_locations: integer('config_max_locations'),
    config_max_storage_gb: integer('config_max_storage_gb'),
    config_api_rate_limit: integer('config_api_rate_limit'),

    // Internal notes
    internal_notes: text('internal_notes'),
    internal_tags: jsonb('internal_tags'), // ['enterprise', 'high-value', 'at-risk']
  },
  (table) => [
    index('idx_parent_tenants_slug').on(table.info_company_slug),
    index('idx_parent_tenants_status').on(table.meta_status),
    index('idx_parent_tenants_owner_email').on(table.owner_email),
    index('idx_parent_tenants_created_at').on(table.meta_created_at),
  ]
)

// =============================================================================
// PARENT_TENANT_CONTACTS - Additional contacts per tenant
// =============================================================================
export const parentTenantContacts = pgTable(
  'parent_tenant_contacts',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),

    info_role: varchar('info_role', { length: 50 }).notNull(), // billing, technical, executive, support
    info_first_name: varchar('info_first_name', { length: 100 }).notNull(),
    info_last_name: varchar('info_last_name', { length: 100 }).notNull(),
    info_email: varchar('info_email', { length: 255 }).notNull(),
    info_phone: varchar('info_phone', { length: 30 }),
    info_title: varchar('info_title', { length: 100 }),

    config_is_primary: boolean('config_is_primary').notNull().default(false),
    config_receives_invoices: boolean('config_receives_invoices').notNull().default(false),
    config_receives_alerts: boolean('config_receives_alerts').notNull().default(false),
  },
  (table) => [
    index('idx_parent_tenant_contacts_tenant').on(table.ref_tenant_id),
    index('idx_parent_tenant_contacts_role').on(table.info_role),
  ]
)

// =============================================================================
// PARENT_SUBSCRIPTIONS - Subscription details
// =============================================================================
export const parentSubscriptions = pgTable(
  'parent_subscriptions',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull().default('trialing'), // trialing, active, past_due, cancelled, paused

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),

    // Plan info
    info_plan: varchar('info_plan', { length: 30 }).notNull(), // starter, professional, enterprise
    info_billing_cycle: varchar('info_billing_cycle', { length: 10 }).notNull(), // monthly, annual
    info_price_per_seat: decimal('info_price_per_seat', { precision: 10, scale: 2 }),
    info_base_price: decimal('info_base_price', { precision: 10, scale: 2 }),
    info_discount_percent: decimal('info_discount_percent', { precision: 5, scale: 2 }),

    // Seat tracking
    info_included_seats: integer('info_included_seats'),
    info_current_seats: integer('info_current_seats').default(1),
    info_max_seats: integer('info_max_seats'),

    // Period tracking
    info_trial_ends_at: timestamp('info_trial_ends_at', { withTimezone: true }),
    info_current_period_start: timestamp('info_current_period_start', { withTimezone: true }),
    info_current_period_end: timestamp('info_current_period_end', { withTimezone: true }),
    info_cancelled_at: timestamp('info_cancelled_at', { withTimezone: true }),
    info_cancel_at_period_end: boolean('info_cancel_at_period_end').default(false),

    // Stripe references
    stripe_customer_id: varchar('stripe_customer_id', { length: 100 }),
    stripe_subscription_id: varchar('stripe_subscription_id', { length: 100 }),
    stripe_price_id: varchar('stripe_price_id', { length: 100 }),

    // Compliance add-ons
    has_hipaa: boolean('has_hipaa').notNull().default(false),
    has_gdpr: boolean('has_gdpr').notNull().default(false),
    has_soc2: boolean('has_soc2').notNull().default(false),
    hipaa_baa_signed_at: timestamp('hipaa_baa_signed_at', { withTimezone: true }),
    gdpr_dpa_signed_at: timestamp('gdpr_dpa_signed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_parent_subscriptions_tenant').on(table.ref_tenant_id),
    index('idx_parent_subscriptions_status').on(table.meta_status),
    index('idx_parent_subscriptions_plan').on(table.info_plan),
    index('idx_parent_subscriptions_stripe_customer').on(table.stripe_customer_id),
  ]
)

// =============================================================================
// PARENT_INVOICES - Invoice history
// =============================================================================
export const parentInvoices = pgTable(
  'parent_invoices',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull().default('draft'), // draft, open, paid, void, uncollectible

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),
    ref_subscription_id: uuid('ref_subscription_id').references(() => parentSubscriptions.meta_id),

    // Invoice details
    info_number: varchar('info_number', { length: 50 }).unique(), // INV-2025-0001
    info_period_start: date('info_period_start'),
    info_period_end: date('info_period_end'),
    info_due_date: date('info_due_date'),

    // Amounts
    info_subtotal: decimal('info_subtotal', { precision: 10, scale: 2 }),
    info_tax: decimal('info_tax', { precision: 10, scale: 2 }),
    info_discount: decimal('info_discount', { precision: 10, scale: 2 }),
    info_total: decimal('info_total', { precision: 10, scale: 2 }),
    info_amount_paid: decimal('info_amount_paid', { precision: 10, scale: 2 }),
    info_amount_due: decimal('info_amount_due', { precision: 10, scale: 2 }),
    info_currency: varchar('info_currency', { length: 3 }).default('USD'),

    // Line items stored as JSON
    info_line_items: jsonb('info_line_items'), // [{ description, quantity, unit_price, amount }]

    // Payment info
    info_paid_at: timestamp('info_paid_at', { withTimezone: true }),
    info_payment_method: varchar('info_payment_method', { length: 50 }),

    // Stripe references
    stripe_invoice_id: varchar('stripe_invoice_id', { length: 100 }),
    stripe_payment_intent_id: varchar('stripe_payment_intent_id', { length: 100 }),
    stripe_hosted_invoice_url: varchar('stripe_hosted_invoice_url', { length: 500 }),
    stripe_pdf_url: varchar('stripe_pdf_url', { length: 500 }),

    // Notes
    info_memo: text('info_memo'),
  },
  (table) => [
    index('idx_parent_invoices_tenant').on(table.ref_tenant_id),
    index('idx_parent_invoices_status').on(table.meta_status),
    index('idx_parent_invoices_created_at').on(table.meta_created_at),
    index('idx_parent_invoices_stripe').on(table.stripe_invoice_id),
  ]
)

// =============================================================================
// PARENT_PAYMENTS - Payment transaction history
// =============================================================================
export const parentPayments = pgTable(
  'parent_payments',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull(), // succeeded, pending, failed, refunded

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),
    ref_invoice_id: uuid('ref_invoice_id').references(() => parentInvoices.meta_id),

    // Payment details
    info_amount: decimal('info_amount', { precision: 10, scale: 2 }).notNull(),
    info_currency: varchar('info_currency', { length: 3 }).default('USD'),
    info_payment_method: varchar('info_payment_method', { length: 50 }), // card, bank_transfer, wire
    info_card_brand: varchar('info_card_brand', { length: 20 }),
    info_card_last4: varchar('info_card_last4', { length: 4 }),

    // Failure info
    info_failure_code: varchar('info_failure_code', { length: 50 }),
    info_failure_message: text('info_failure_message'),

    // Refund info
    info_refunded_amount: decimal('info_refunded_amount', { precision: 10, scale: 2 }),
    info_refunded_at: timestamp('info_refunded_at', { withTimezone: true }),
    info_refund_reason: text('info_refund_reason'),

    // Stripe references
    stripe_payment_intent_id: varchar('stripe_payment_intent_id', { length: 100 }),
    stripe_charge_id: varchar('stripe_charge_id', { length: 100 }),
    stripe_refund_id: varchar('stripe_refund_id', { length: 100 }),
  },
  (table) => [
    index('idx_parent_payments_tenant').on(table.ref_tenant_id),
    index('idx_parent_payments_status').on(table.meta_status),
    index('idx_parent_payments_created_at').on(table.meta_created_at),
  ]
)

// =============================================================================
// PARENT_USAGE_METRICS - Usage tracking for billing/analytics
// =============================================================================
export const parentUsageMetrics = pgTable(
  'parent_usage_metrics',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),

    // Period this metric covers
    info_period_start: timestamp('info_period_start', { withTimezone: true }).notNull(),
    info_period_end: timestamp('info_period_end', { withTimezone: true }).notNull(),
    info_period_type: varchar('info_period_type', { length: 20 }).notNull(), // daily, weekly, monthly

    // User metrics
    metric_active_users: integer('metric_active_users'),
    metric_total_users: integer('metric_total_users'),
    metric_billable_users: integer('metric_billable_users'),
    metric_new_users: integer('metric_new_users'),

    // Activity metrics
    metric_logins: integer('metric_logins'),
    metric_api_calls: integer('metric_api_calls'),
    metric_reports_generated: integer('metric_reports_generated'),

    // Storage metrics
    metric_storage_used_mb: integer('metric_storage_used_mb'),
    metric_documents_count: integer('metric_documents_count'),

    // Feature usage (JSON for flexibility)
    metric_feature_usage: jsonb('metric_feature_usage'), // { scheduling: 150, timeoff: 45, ... }
  },
  (table) => [
    index('idx_parent_usage_metrics_tenant').on(table.ref_tenant_id),
    index('idx_parent_usage_metrics_period').on(table.info_period_start, table.info_period_end),
  ]
)

// =============================================================================
// PARENT_AUDIT_LOGS - Platform-level audit trail
// =============================================================================
export const parentAuditLogs = pgTable(
  'parent_audit_logs',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

    ref_tenant_id: uuid('ref_tenant_id').references(() => parentTenants.meta_id, { onDelete: 'set null' }),

    // Who did it
    actor_type: varchar('actor_type', { length: 20 }).notNull(), // system, admin, tenant_owner, stripe_webhook
    actor_id: varchar('actor_id', { length: 100 }),
    actor_email: varchar('actor_email', { length: 255 }),
    actor_ip: varchar('actor_ip', { length: 45 }),

    // What happened
    action: varchar('action', { length: 50 }).notNull(), // tenant.created, subscription.upgraded, payment.failed
    resource_type: varchar('resource_type', { length: 50 }).notNull(),
    resource_id: uuid('resource_id'),
    description: text('description'),
    changes: jsonb('changes'), // { before: {}, after: {} }

    // Context
    context: jsonb('context'), // Additional metadata
  },
  (table) => [
    index('idx_parent_audit_logs_tenant').on(table.ref_tenant_id),
    index('idx_parent_audit_logs_action').on(table.action),
    index('idx_parent_audit_logs_created_at').on(table.meta_created_at),
  ]
)

// =============================================================================
// PARENT_SUPPORT_TICKETS - Support request tracking
// =============================================================================
export const parentSupportTickets = pgTable(
  'parent_support_tickets',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull().default('open'), // open, in_progress, waiting, resolved, closed

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),

    // Ticket info
    info_number: varchar('info_number', { length: 20 }).unique(), // TKT-0001
    info_subject: varchar('info_subject', { length: 255 }).notNull(),
    info_description: text('info_description'),
    info_priority: varchar('info_priority', { length: 20 }).default('normal'), // low, normal, high, urgent
    info_category: varchar('info_category', { length: 50 }), // billing, technical, feature_request, bug

    // Contact info
    contact_email: varchar('contact_email', { length: 255 }).notNull(),
    contact_name: varchar('contact_name', { length: 200 }),

    // Resolution
    info_resolved_at: timestamp('info_resolved_at', { withTimezone: true }),
    info_resolution_notes: text('info_resolution_notes'),

    // Assignment
    assigned_to: varchar('assigned_to', { length: 100 }),

    // External references
    external_ticket_id: varchar('external_ticket_id', { length: 100 }), // Zendesk, Intercom, etc.
  },
  (table) => [
    index('idx_parent_support_tickets_tenant').on(table.ref_tenant_id),
    index('idx_parent_support_tickets_status').on(table.meta_status),
    index('idx_parent_support_tickets_priority').on(table.info_priority),
  ]
)

// =============================================================================
// PARENT_ANNOUNCEMENTS - Platform announcements
// =============================================================================
export const parentAnnouncements = pgTable(
  'parent_announcements',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_status: varchar('meta_status', { length: 20 }).notNull().default('draft'), // draft, published, archived

    // Content
    info_title: varchar('info_title', { length: 255 }).notNull(),
    info_content: text('info_content'),
    info_type: varchar('info_type', { length: 30 }).notNull(), // maintenance, feature, security, billing

    // Targeting
    target_plans: jsonb('target_plans'), // ['starter', 'professional'] or null for all
    target_tenant_ids: jsonb('target_tenant_ids'), // Specific tenants or null for all

    // Scheduling
    publish_at: timestamp('publish_at', { withTimezone: true }),
    expires_at: timestamp('expires_at', { withTimezone: true }),

    // Display
    config_is_dismissible: boolean('config_is_dismissible').default(true),
    config_show_in_app: boolean('config_show_in_app').default(true),
    config_send_email: boolean('config_send_email').default(false),
  },
  (table) => [
    index('idx_parent_announcements_status').on(table.meta_status),
    index('idx_parent_announcements_type').on(table.info_type),
  ]
)

// =============================================================================
// PARENT_FEATURE_FLAGS - Feature toggles per tenant
// =============================================================================
export const parentFeatureFlags = pgTable(
  'parent_feature_flags',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
    meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

    // Flag definition
    info_code: varchar('info_code', { length: 50 }).notNull().unique(),
    info_name: varchar('info_name', { length: 100 }).notNull(),
    info_description: text('info_description'),

    // Default state
    config_default_enabled: boolean('config_default_enabled').notNull().default(false),

    // Plan-based enabling
    config_enabled_plans: jsonb('config_enabled_plans'), // ['professional', 'enterprise']

    // Tenant-specific overrides stored separately
  },
  (table) => [
    index('idx_parent_feature_flags_code').on(table.info_code),
  ]
)

// =============================================================================
// PARENT_TENANT_FEATURE_OVERRIDES - Per-tenant feature flag overrides
// =============================================================================
export const parentTenantFeatureOverrides = pgTable(
  'parent_tenant_feature_overrides',
  {
    meta_id: uuid('meta_id').primaryKey().defaultRandom(),
    meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

    ref_tenant_id: uuid('ref_tenant_id').notNull().references(() => parentTenants.meta_id, { onDelete: 'cascade' }),
    ref_feature_id: uuid('ref_feature_id').notNull().references(() => parentFeatureFlags.meta_id, { onDelete: 'cascade' }),

    config_enabled: boolean('config_enabled').notNull(),
    info_reason: text('info_reason'), // Why this override exists
    info_expires_at: timestamp('info_expires_at', { withTimezone: true }), // Temporary overrides
  },
  (table) => [
    index('idx_parent_tenant_feature_overrides_tenant').on(table.ref_tenant_id),
    index('idx_parent_tenant_feature_overrides_feature').on(table.ref_feature_id),
  ]
)

// =============================================================================
// RELATIONS
// =============================================================================

export const parentTenantsRelations = relations(parentTenants, ({ one, many }) => ({
  subscription: one(parentSubscriptions, {
    fields: [parentTenants.meta_id],
    references: [parentSubscriptions.ref_tenant_id],
  }),
  contacts: many(parentTenantContacts),
  invoices: many(parentInvoices),
  payments: many(parentPayments),
  usageMetrics: many(parentUsageMetrics),
  auditLogs: many(parentAuditLogs),
  supportTickets: many(parentSupportTickets),
  featureOverrides: many(parentTenantFeatureOverrides),
}))

export const parentTenantContactsRelations = relations(parentTenantContacts, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentTenantContacts.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
}))

export const parentSubscriptionsRelations = relations(parentSubscriptions, ({ one, many }) => ({
  tenant: one(parentTenants, {
    fields: [parentSubscriptions.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
  invoices: many(parentInvoices),
}))

export const parentInvoicesRelations = relations(parentInvoices, ({ one, many }) => ({
  tenant: one(parentTenants, {
    fields: [parentInvoices.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
  subscription: one(parentSubscriptions, {
    fields: [parentInvoices.ref_subscription_id],
    references: [parentSubscriptions.meta_id],
  }),
  payments: many(parentPayments),
}))

export const parentPaymentsRelations = relations(parentPayments, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentPayments.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
  invoice: one(parentInvoices, {
    fields: [parentPayments.ref_invoice_id],
    references: [parentInvoices.meta_id],
  }),
}))

export const parentUsageMetricsRelations = relations(parentUsageMetrics, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentUsageMetrics.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
}))

export const parentAuditLogsRelations = relations(parentAuditLogs, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentAuditLogs.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
}))

export const parentSupportTicketsRelations = relations(parentSupportTickets, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentSupportTickets.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
}))

export const parentFeatureFlagsRelations = relations(parentFeatureFlags, ({ many }) => ({
  tenantOverrides: many(parentTenantFeatureOverrides),
}))

export const parentTenantFeatureOverridesRelations = relations(parentTenantFeatureOverrides, ({ one }) => ({
  tenant: one(parentTenants, {
    fields: [parentTenantFeatureOverrides.ref_tenant_id],
    references: [parentTenants.meta_id],
  }),
  feature: one(parentFeatureFlags, {
    fields: [parentTenantFeatureOverrides.ref_feature_id],
    references: [parentFeatureFlags.meta_id],
  }),
}))

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ParentTenant = typeof parentTenants.$inferSelect
export type NewParentTenant = typeof parentTenants.$inferInsert

export type ParentTenantContact = typeof parentTenantContacts.$inferSelect
export type NewParentTenantContact = typeof parentTenantContacts.$inferInsert

export type ParentSubscription = typeof parentSubscriptions.$inferSelect
export type NewParentSubscription = typeof parentSubscriptions.$inferInsert

export type ParentInvoice = typeof parentInvoices.$inferSelect
export type NewParentInvoice = typeof parentInvoices.$inferInsert

export type ParentPayment = typeof parentPayments.$inferSelect
export type NewParentPayment = typeof parentPayments.$inferInsert

export type ParentUsageMetric = typeof parentUsageMetrics.$inferSelect
export type NewParentUsageMetric = typeof parentUsageMetrics.$inferInsert

export type ParentAuditLog = typeof parentAuditLogs.$inferSelect
export type NewParentAuditLog = typeof parentAuditLogs.$inferInsert

export type ParentSupportTicket = typeof parentSupportTickets.$inferSelect
export type NewParentSupportTicket = typeof parentSupportTickets.$inferInsert

export type ParentAnnouncement = typeof parentAnnouncements.$inferSelect
export type NewParentAnnouncement = typeof parentAnnouncements.$inferInsert

export type ParentFeatureFlag = typeof parentFeatureFlags.$inferSelect
export type NewParentFeatureFlag = typeof parentFeatureFlags.$inferInsert

export type ParentTenantFeatureOverride = typeof parentTenantFeatureOverrides.$inferSelect
export type NewParentTenantFeatureOverride = typeof parentTenantFeatureOverrides.$inferInsert
