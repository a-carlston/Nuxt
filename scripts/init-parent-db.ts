/**
 * Initialize the parent database schema
 * This creates all parent/control plane tables in the main Neon database.
 *
 * Run with: npx tsx scripts/init-parent-db.ts
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config()

async function initParentSchema() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment')
    process.exit(1)
  }

  console.log('Connecting to parent database...')
  const sql = neon(databaseUrl)

  console.log('Creating parent schema tables...\n')

  // =========================================================================
  // PARENT_TENANTS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_tenants (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'active',
      info_company_name VARCHAR(255) NOT NULL,
      info_company_slug VARCHAR(30) NOT NULL UNIQUE,
      info_industry VARCHAR(50),
      info_company_size VARCHAR(20),
      info_website VARCHAR(255),
      info_logo_url VARCHAR(500),
      neon_branch_id VARCHAR(100),
      neon_branch_name VARCHAR(100),
      neon_host VARCHAR(255),
      neon_database_name VARCHAR(100) DEFAULT 'neondb',
      connection_string TEXT,
      owner_email VARCHAR(255) NOT NULL,
      owner_first_name VARCHAR(100) NOT NULL,
      owner_last_name VARCHAR(100) NOT NULL,
      owner_phone VARCHAR(30),
      onboarding_completed_at TIMESTAMPTZ,
      onboarding_step VARCHAR(50) DEFAULT 'registered',
      config_max_users INTEGER,
      config_max_locations INTEGER,
      config_max_storage_gb INTEGER,
      config_api_rate_limit INTEGER,
      internal_notes TEXT,
      internal_tags JSONB
    )
  `
  console.log('  Created: parent_tenants')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenants_slug ON parent_tenants(info_company_slug)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenants_status ON parent_tenants(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenants_owner_email ON parent_tenants(owner_email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenants_created_at ON parent_tenants(meta_created_at)`

  // =========================================================================
  // PARENT_TENANT_CONTACTS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_tenant_contacts (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      info_role VARCHAR(50) NOT NULL,
      info_first_name VARCHAR(100) NOT NULL,
      info_last_name VARCHAR(100) NOT NULL,
      info_email VARCHAR(255) NOT NULL,
      info_phone VARCHAR(30),
      info_title VARCHAR(100),
      config_is_primary BOOLEAN NOT NULL DEFAULT false,
      config_receives_invoices BOOLEAN NOT NULL DEFAULT false,
      config_receives_alerts BOOLEAN NOT NULL DEFAULT false
    )
  `
  console.log('  Created: parent_tenant_contacts')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenant_contacts_tenant ON parent_tenant_contacts(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenant_contacts_role ON parent_tenant_contacts(info_role)`

  // =========================================================================
  // PARENT_SUBSCRIPTIONS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_subscriptions (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'trialing',
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      info_plan VARCHAR(30) NOT NULL,
      info_billing_cycle VARCHAR(10) NOT NULL,
      info_price_per_seat DECIMAL(10,2),
      info_base_price DECIMAL(10,2),
      info_discount_percent DECIMAL(5,2),
      info_included_seats INTEGER,
      info_current_seats INTEGER DEFAULT 1,
      info_max_seats INTEGER,
      info_trial_ends_at TIMESTAMPTZ,
      info_current_period_start TIMESTAMPTZ,
      info_current_period_end TIMESTAMPTZ,
      info_cancelled_at TIMESTAMPTZ,
      info_cancel_at_period_end BOOLEAN DEFAULT false,
      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100),
      stripe_price_id VARCHAR(100),
      has_hipaa BOOLEAN NOT NULL DEFAULT false,
      has_gdpr BOOLEAN NOT NULL DEFAULT false,
      has_soc2 BOOLEAN NOT NULL DEFAULT false,
      hipaa_baa_signed_at TIMESTAMPTZ,
      gdpr_dpa_signed_at TIMESTAMPTZ
    )
  `
  console.log('  Created: parent_subscriptions')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_subscriptions_tenant ON parent_subscriptions(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_subscriptions_status ON parent_subscriptions(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_subscriptions_plan ON parent_subscriptions(info_plan)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_subscriptions_stripe_customer ON parent_subscriptions(stripe_customer_id)`

  // =========================================================================
  // PARENT_INVOICES
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_invoices (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'draft',
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      ref_subscription_id UUID REFERENCES parent_subscriptions(meta_id),
      info_number VARCHAR(50) UNIQUE,
      info_period_start DATE,
      info_period_end DATE,
      info_due_date DATE,
      info_subtotal DECIMAL(10,2),
      info_tax DECIMAL(10,2),
      info_discount DECIMAL(10,2),
      info_total DECIMAL(10,2),
      info_amount_paid DECIMAL(10,2),
      info_amount_due DECIMAL(10,2),
      info_currency VARCHAR(3) DEFAULT 'USD',
      info_line_items JSONB,
      info_paid_at TIMESTAMPTZ,
      info_payment_method VARCHAR(50),
      stripe_invoice_id VARCHAR(100),
      stripe_payment_intent_id VARCHAR(100),
      stripe_hosted_invoice_url VARCHAR(500),
      stripe_pdf_url VARCHAR(500),
      info_memo TEXT
    )
  `
  console.log('  Created: parent_invoices')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_invoices_tenant ON parent_invoices(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_invoices_status ON parent_invoices(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_invoices_created_at ON parent_invoices(meta_created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_invoices_stripe ON parent_invoices(stripe_invoice_id)`

  // =========================================================================
  // PARENT_PAYMENTS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_payments (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL,
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      ref_invoice_id UUID REFERENCES parent_invoices(meta_id),
      info_amount DECIMAL(10,2) NOT NULL,
      info_currency VARCHAR(3) DEFAULT 'USD',
      info_payment_method VARCHAR(50),
      info_card_brand VARCHAR(20),
      info_card_last4 VARCHAR(4),
      info_failure_code VARCHAR(50),
      info_failure_message TEXT,
      info_refunded_amount DECIMAL(10,2),
      info_refunded_at TIMESTAMPTZ,
      info_refund_reason TEXT,
      stripe_payment_intent_id VARCHAR(100),
      stripe_charge_id VARCHAR(100),
      stripe_refund_id VARCHAR(100)
    )
  `
  console.log('  Created: parent_payments')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_payments_tenant ON parent_payments(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_payments_status ON parent_payments(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_payments_created_at ON parent_payments(meta_created_at)`

  // =========================================================================
  // PARENT_USAGE_METRICS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_usage_metrics (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      info_period_start TIMESTAMPTZ NOT NULL,
      info_period_end TIMESTAMPTZ NOT NULL,
      info_period_type VARCHAR(20) NOT NULL,
      metric_active_users INTEGER,
      metric_total_users INTEGER,
      metric_billable_users INTEGER,
      metric_new_users INTEGER,
      metric_logins INTEGER,
      metric_api_calls INTEGER,
      metric_reports_generated INTEGER,
      metric_storage_used_mb INTEGER,
      metric_documents_count INTEGER,
      metric_feature_usage JSONB
    )
  `
  console.log('  Created: parent_usage_metrics')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_usage_metrics_tenant ON parent_usage_metrics(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_usage_metrics_period ON parent_usage_metrics(info_period_start, info_period_end)`

  // =========================================================================
  // PARENT_AUDIT_LOGS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_audit_logs (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_tenant_id UUID REFERENCES parent_tenants(meta_id) ON DELETE SET NULL,
      actor_type VARCHAR(20) NOT NULL,
      actor_id VARCHAR(100),
      actor_email VARCHAR(255),
      actor_ip VARCHAR(45),
      action VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id UUID,
      description TEXT,
      changes JSONB,
      context JSONB
    )
  `
  console.log('  Created: parent_audit_logs')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_audit_logs_tenant ON parent_audit_logs(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_audit_logs_action ON parent_audit_logs(action)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_audit_logs_created_at ON parent_audit_logs(meta_created_at)`

  // =========================================================================
  // PARENT_SUPPORT_TICKETS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_support_tickets (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'open',
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      info_number VARCHAR(20) UNIQUE,
      info_subject VARCHAR(255) NOT NULL,
      info_description TEXT,
      info_priority VARCHAR(20) DEFAULT 'normal',
      info_category VARCHAR(50),
      contact_email VARCHAR(255) NOT NULL,
      contact_name VARCHAR(200),
      info_resolved_at TIMESTAMPTZ,
      info_resolution_notes TEXT,
      assigned_to VARCHAR(100),
      external_ticket_id VARCHAR(100)
    )
  `
  console.log('  Created: parent_support_tickets')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_support_tickets_tenant ON parent_support_tickets(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_support_tickets_status ON parent_support_tickets(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_support_tickets_priority ON parent_support_tickets(info_priority)`

  // =========================================================================
  // PARENT_ANNOUNCEMENTS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_announcements (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_status VARCHAR(20) NOT NULL DEFAULT 'draft',
      info_title VARCHAR(255) NOT NULL,
      info_content TEXT,
      info_type VARCHAR(30) NOT NULL,
      target_plans JSONB,
      target_tenant_ids JSONB,
      publish_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      config_is_dismissible BOOLEAN DEFAULT true,
      config_show_in_app BOOLEAN DEFAULT true,
      config_send_email BOOLEAN DEFAULT false
    )
  `
  console.log('  Created: parent_announcements')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_announcements_status ON parent_announcements(meta_status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_announcements_type ON parent_announcements(info_type)`

  // =========================================================================
  // PARENT_FEATURE_FLAGS
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_feature_flags (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      meta_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      info_code VARCHAR(50) NOT NULL UNIQUE,
      info_name VARCHAR(100) NOT NULL,
      info_description TEXT,
      config_default_enabled BOOLEAN NOT NULL DEFAULT false,
      config_enabled_plans JSONB
    )
  `
  console.log('  Created: parent_feature_flags')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_feature_flags_code ON parent_feature_flags(info_code)`

  // =========================================================================
  // PARENT_TENANT_FEATURE_OVERRIDES
  // =========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS parent_tenant_feature_overrides (
      meta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ref_tenant_id UUID NOT NULL REFERENCES parent_tenants(meta_id) ON DELETE CASCADE,
      ref_feature_id UUID NOT NULL REFERENCES parent_feature_flags(meta_id) ON DELETE CASCADE,
      config_enabled BOOLEAN NOT NULL,
      info_reason TEXT,
      info_expires_at TIMESTAMPTZ
    )
  `
  console.log('  Created: parent_tenant_feature_overrides')

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenant_feature_overrides_tenant ON parent_tenant_feature_overrides(ref_tenant_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_parent_tenant_feature_overrides_feature ON parent_tenant_feature_overrides(ref_feature_id)`

  console.log('\n✓ Parent schema initialized successfully!')
  console.log('\nTables created:')
  console.log('  - parent_tenants (master tenant registry)')
  console.log('  - parent_tenant_contacts (additional contacts per tenant)')
  console.log('  - parent_subscriptions (subscription details)')
  console.log('  - parent_invoices (invoice history)')
  console.log('  - parent_payments (payment transactions)')
  console.log('  - parent_usage_metrics (usage tracking)')
  console.log('  - parent_audit_logs (platform audit trail)')
  console.log('  - parent_support_tickets (support requests)')
  console.log('  - parent_announcements (platform announcements)')
  console.log('  - parent_feature_flags (feature toggles)')
  console.log('  - parent_tenant_feature_overrides (per-tenant feature overrides)')
}

initParentSchema().catch((err) => {
  console.error('Failed to initialize parent schema:', err)
  process.exit(1)
})
