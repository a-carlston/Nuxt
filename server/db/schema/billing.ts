import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  decimal,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// =============================================================================
// billing_subscription - Plan Info
// =============================================================================
export const billingSubscription = pgTable('billing_subscription', {
  // meta_ - System metadata
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_status: varchar('meta_status', { length: 20 }).notNull().default('trialing'), // trialing, active, past_due, cancelled
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // info_ - General display information
  info_plan: varchar('info_plan', { length: 20 }).notNull(), // starter, professional, enterprise
  info_billing_cycle: varchar('info_billing_cycle', { length: 10 }).notNull(), // monthly, annual
  info_estimated_seats: varchar('info_estimated_seats', { length: 20 }),
  info_price_per_seat: decimal('info_price_per_seat', { precision: 10, scale: 2 }),
  info_trial_ends_at: timestamp('info_trial_ends_at', { withTimezone: true }),
  info_current_period_start: timestamp('info_current_period_start', { withTimezone: true }),
  info_current_period_end: timestamp('info_current_period_end', { withTimezone: true }),

  // stripe_ - Payment processor refs
  stripe_customer_id: varchar('stripe_customer_id', { length: 100 }),
  stripe_subscription_id: varchar('stripe_subscription_id', { length: 100 }),
})

// =============================================================================
// billing_compliance - Add-ons (HIPAA, GDPR, SOC2)
// =============================================================================
export const billingCompliance = pgTable('billing_compliance', {
  // meta_ - System metadata
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_status: varchar('meta_status', { length: 20 }).notNull().default('pending'), // active, pending
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // ref_ - Foreign key references
  ref_subscription_id: uuid('ref_subscription_id')
    .notNull()
    .references(() => billingSubscription.meta_id, { onDelete: 'cascade' }),

  // info_ - General display information
  info_compliance_type: varchar('info_compliance_type', { length: 20 }).notNull(), // hipaa, gdpr, soc2
  info_price_per_seat: decimal('info_price_per_seat', { precision: 10, scale: 2 }),
  info_baa_signed_at: timestamp('info_baa_signed_at', { withTimezone: true }), // HIPAA
  info_dpa_signed_at: timestamp('info_dpa_signed_at', { withTimezone: true }), // GDPR
})

// =============================================================================
// billing_addresses - Billing Address
// =============================================================================
export const billingAddresses = pgTable('billing_addresses', {
  // meta_ - System metadata
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),
  meta_updated_at: timestamp('meta_updated_at', { withTimezone: true }).notNull().defaultNow(),

  // config_ - Configuration/settings
  config_same_as_company: boolean('config_same_as_company').default(false),

  // address_ - Address fields
  address_country_code: varchar('address_country_code', { length: 2 }),
  address_state_code: varchar('address_state_code', { length: 10 }),
  address_city: varchar('address_city', { length: 100 }),
  address_line1: varchar('address_line1', { length: 255 }),
  address_line2: varchar('address_line2', { length: 255 }),
  address_postal_code: varchar('address_postal_code', { length: 20 }),
})

// =============================================================================
// billing_payment_methods - Stripe Tokens
// =============================================================================
export const billingPaymentMethods = pgTable('billing_payment_methods', {
  // meta_ - System metadata
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // stripe_ - Payment processor refs
  stripe_payment_method_id: varchar('stripe_payment_method_id', { length: 100 }),

  // info_ - General display information
  info_card_brand: varchar('info_card_brand', { length: 20 }),
  info_card_last4: varchar('info_card_last4', { length: 4 }),
  info_card_exp_month: integer('info_card_exp_month'),
  info_card_exp_year: integer('info_card_exp_year'),
  info_cardholder_name: varchar('info_cardholder_name', { length: 255 }),

  // config_ - Configuration/settings
  config_is_default: boolean('config_is_default').default(false),
})

// =============================================================================
// billing_invoices - Invoice History
// =============================================================================
export const billingInvoices = pgTable('billing_invoices', {
  // meta_ - System metadata
  meta_id: uuid('meta_id').primaryKey().defaultRandom(),
  meta_status: varchar('meta_status', { length: 20 }).notNull().default('draft'), // draft, open, paid, void
  meta_created_at: timestamp('meta_created_at', { withTimezone: true }).notNull().defaultNow(),

  // stripe_ - Payment processor refs
  stripe_invoice_id: varchar('stripe_invoice_id', { length: 100 }),

  // info_ - General display information
  info_number: varchar('info_number', { length: 50 }), // INV-2025-0001
  info_amount: decimal('info_amount', { precision: 10, scale: 2 }),
  info_currency: varchar('info_currency', { length: 3 }).default('USD'),
  info_period_start: date('info_period_start'),
  info_period_end: date('info_period_end'),
  info_due_date: date('info_due_date'),
  info_paid_at: timestamp('info_paid_at', { withTimezone: true }),
  info_pdf_url: varchar('info_pdf_url', { length: 500 }),
})

// =============================================================================
// Relations
// =============================================================================

export const billingSubscriptionRelations = relations(billingSubscription, ({ many }) => ({
  compliance: many(billingCompliance),
}))

export const billingComplianceRelations = relations(billingCompliance, ({ one }) => ({
  subscription: one(billingSubscription, {
    fields: [billingCompliance.ref_subscription_id],
    references: [billingSubscription.meta_id],
  }),
}))
