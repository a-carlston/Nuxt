import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema } from '../db'
import { coreUsers, coreUserTypes, coreLocations, settingsCompany, billingSubscription, billingCompliance, billingAddresses } from '../db'
import { createTenantBranch, initializeTenantSchema } from '../utils/neon'

// Simple password hashing (use argon2 in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'optivo-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()
  const parentDb = useParentDb()

  try {
    // ==========================================================================
    // STEP 1: Check if slug already exists in PARENT database
    // ==========================================================================
    const existingTenant = await parentDb
      .select({ id: parentSchema.parentTenants.meta_id })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, body.companySlug))
      .limit(1)

    if (existingTenant.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Company slug already taken'
      })
    }

    // Check if email already exists in parent (as an owner)
    const existingOwner = await parentDb
      .select({ id: parentSchema.parentTenants.meta_id })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.owner_email, body.email))
      .limit(1)

    if (existingOwner.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Email already registered as a company owner'
      })
    }

    // ==========================================================================
    // STEP 2: Create Neon branch for this tenant
    // ==========================================================================
    if (!config.neonApiKey || !config.neonProjectId) {
      throw createError({
        statusCode: 500,
        message: 'Neon API not configured'
      })
    }

    console.log(`Creating Neon branch for tenant: ${body.companySlug}`)

    const branchInfo = await createTenantBranch(
      body.companySlug,
      config.neonApiKey,
      config.neonProjectId
    )

    console.log(`Branch created: ${branchInfo.branchName} (${branchInfo.branchId})`)

    // ==========================================================================
    // STEP 3: Initialize tenant schema on the new branch
    // ==========================================================================
    console.log('Initializing tenant schema...')
    await initializeTenantSchema(branchInfo.connectionString)
    console.log('Tenant schema initialized')

    // ==========================================================================
    // STEP 4: Store tenant record in PARENT database
    // ==========================================================================
    const [newTenant] = await parentDb.insert(parentSchema.parentTenants).values({
      info_company_name: body.companyName,
      info_company_slug: body.companySlug,
      info_industry: body.industry || null,
      info_company_size: body.companySize || null,
      info_website: body.website || null,
      info_logo_url: body.logoUrl || null,
      neon_branch_id: branchInfo.branchId,
      neon_branch_name: branchInfo.branchName,
      neon_host: branchInfo.host,
      connection_string: branchInfo.connectionString, // TODO: Encrypt this
      owner_email: body.email,
      owner_first_name: body.firstName,
      owner_last_name: body.lastName,
      owner_phone: body.phone || null,
      onboarding_step: 'registered',
    }).returning()

    // Create subscription record in parent
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    await parentDb.insert(parentSchema.parentSubscriptions).values({
      ref_tenant_id: newTenant!.meta_id,
      meta_status: 'trialing',
      info_plan: body.selectedPlan,
      info_billing_cycle: body.billingCycle,
      info_trial_ends_at: trialEndsAt,
      info_current_period_start: new Date(),
      info_current_period_end: trialEndsAt,
      info_current_seats: 1,
      has_hipaa: body.selectedCompliance?.includes('hipaa') || false,
      has_gdpr: body.selectedCompliance?.includes('gdpr') || false,
      has_soc2: body.selectedCompliance?.includes('soc2') || false,
    })

    // Log the registration in parent audit logs
    await parentDb.insert(parentSchema.parentAuditLogs).values({
      ref_tenant_id: newTenant!.meta_id,
      actor_type: 'tenant_owner',
      actor_email: body.email,
      action: 'tenant.created',
      resource_type: 'tenant',
      resource_id: newTenant!.meta_id,
      description: `New tenant registered: ${body.companyName}`,
    })

    // ==========================================================================
    // STEP 5: Create data in TENANT branch
    // ==========================================================================
    const tenantDb = useTenantDb(branchInfo.connectionString)

    // Get admin user type (created during schema init)
    const adminUserType = await tenantDb
      .select()
      .from(coreUserTypes)
      .where(eq(coreUserTypes.info_code, 'admin'))
      .limit(1)

    // Hash password
    const passwordHash = await hashPassword(body.password)

    // Create the admin user in tenant branch
    const [newUser] = await tenantDb.insert(coreUsers).values({
      meta_status: 'active',
      ref_user_type_id: adminUserType[0]?.meta_id,
      auth_password_hash: passwordHash,
      auth_email_verified_at: new Date(),
      personal_first_name: body.firstName,
      personal_preferred_name: body.preferredName || null,
      personal_last_name: body.lastName,
      personal_maiden_name: body.maidenName || null,
      personal_email: body.email,
      personal_phone: body.phone,
      personal_phone_country_code: body.personalPhoneCode || null,
      personal_avatar_url: body.avatarUrl || null,
      personal_address_country_code: body.personalCountry,
      personal_address_state_code: body.personalState,
      personal_address_city: body.personalCity,
      personal_address_line1: body.personalAddress,
      personal_address_line2: body.personalAddress2 || null,
      personal_address_postal_code: body.personalZip,
      company_email: body.email,
      company_title: 'Administrator'
    }).returning()

    // Create company settings in tenant branch
    const [newCompany] = await tenantDb.insert(settingsCompany).values({
      info_company_name: body.companyName,
      info_company_slug: body.companySlug,
      info_tagline: body.companyTagline || null,
      info_industry: body.industry,
      info_company_size: body.companySize || null,
      info_website: body.website || null,
      info_tax_id: body.taxId || null,
      brand_logo_url: body.logoUrl || null,
      brand_header_image_url: body.headerImageUrl || null,
      brand_use_custom_header: body.useCustomHeader || false,
      config_default_timezone: 'America/New_York',
      config_date_format: 'MM/DD/YYYY',
      config_time_format: '12h',
      config_week_start: 'sunday',
      config_location_mode: 'multi',
      config_department_mode: 'single',
      config_division_mode: 'single',
      config_lob_mode: 'multi',
      config_retention_days: body.selectedCompliance?.includes('hipaa') ? null : 30,
      config_password_history_count: 12,
      config_password_min_length: body.selectedCompliance?.includes('hipaa') ? 12 : 8,
      config_password_require_special: body.selectedCompliance?.includes('hipaa') || false,
      config_session_timeout_minutes: body.selectedCompliance?.includes('hipaa') ? 30 : 480,
      config_mfa_required: body.selectedCompliance?.includes('hipaa') || false
    }).returning()

    // Create company headquarters location in tenant branch
    await tenantDb.insert(coreLocations).values({
      info_code: 'HQ',
      info_name: 'Headquarters',
      address_country_code: body.companyCountry,
      address_state_code: body.companyState,
      address_city: body.companyCity,
      address_line1: body.companyAddress,
      address_line2: body.companyAddress2 || null,
      address_postal_code: body.companyZip,
      geo_timezone: 'America/New_York',
      config_is_headquarters: true,
      config_is_active: true
    })

    // Create subscription in tenant branch (mirror of parent)
    const [newSubscription] = await tenantDb.insert(billingSubscription).values({
      meta_status: 'trialing',
      info_plan: body.selectedPlan,
      info_billing_cycle: body.billingCycle,
      info_estimated_seats: body.estimatedEmployees,
      info_trial_ends_at: trialEndsAt,
      info_current_period_start: new Date(),
      info_current_period_end: trialEndsAt
    }).returning()

    // Create compliance add-ons in tenant branch
    if (body.selectedCompliance && body.selectedCompliance.length > 0) {
      for (const complianceType of body.selectedCompliance) {
        await tenantDb.insert(billingCompliance).values({
          meta_status: 'active',
          ref_subscription_id: newSubscription!.meta_id,
          info_compliance_type: complianceType
        })
      }
    }

    // Create billing address in tenant branch
    await tenantDb.insert(billingAddresses).values({
      config_same_as_company: body.sameAsCompany,
      address_country_code: body.sameAsCompany ? body.companyCountry : body.billingCountry,
      address_state_code: body.sameAsCompany ? body.companyState : body.billingState,
      address_city: body.sameAsCompany ? body.companyCity : body.billingCity,
      address_line1: body.sameAsCompany ? body.companyAddress : body.billingAddress,
      address_line2: body.sameAsCompany ? body.companyAddress2 : body.billingAddress2,
      address_postal_code: body.sameAsCompany ? body.companyZip : body.billingZip
    })

    // ==========================================================================
    // STEP 6: Return success
    // ==========================================================================
    return {
      success: true,
      tenant: {
        id: newTenant!.meta_id,
        slug: newTenant!.info_company_slug,
        branchId: branchInfo.branchId
      },
      user: {
        id: newUser!.meta_id,
        email: newUser!.personal_email,
        firstName: newUser!.personal_first_name,
        lastName: newUser!.personal_last_name
      },
      company: {
        id: newCompany!.meta_id,
        name: newCompany!.info_company_name,
        slug: newCompany!.info_company_slug
      },
      subscription: {
        id: newSubscription!.meta_id,
        plan: newSubscription!.info_plan,
        trialEndsAt: newSubscription!.info_trial_ends_at
      }
    }
  } catch (error: any) {
    // Re-throw if it's already a proper error
    if (error.statusCode) throw error

    console.error('Registration error:', error)
    throw createError({
      statusCode: 500,
      message: 'Registration failed. Please try again.'
    })
  }
})
