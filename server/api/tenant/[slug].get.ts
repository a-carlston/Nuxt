import { eq } from 'drizzle-orm'
import { useParentDb, parentSchema } from '../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Look up tenant by slug in parent database
    const [tenant] = await parentDb
      .select({
        id: parentSchema.parentTenants.meta_id,
        companyName: parentSchema.parentTenants.info_company_name,
        companySlug: parentSchema.parentTenants.info_company_slug,
        logoUrl: parentSchema.parentTenants.info_logo_url,
        industry: parentSchema.parentTenants.info_industry,
        status: parentSchema.parentTenants.meta_status,
        neonBranchId: parentSchema.parentTenants.neon_branch_id,
        connectionString: parentSchema.parentTenants.connection_string
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      return {
        exists: false,
        tenant: null
      }
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This workspace is currently inactive'
      })
    }

    // Get company settings from tenant database for branding
    let companySettings = null
    if (tenant.connectionString) {
      try {
        const { useTenantDb, settingsCompany } = await import('../../db')
        const tenantDb = useTenantDb(tenant.connectionString)

        const [settings] = await tenantDb
          .select({
            companyName: settingsCompany.info_company_name,
            tagline: settingsCompany.info_tagline,
            logoUrl: settingsCompany.brand_logo_url,
            headerImageUrl: settingsCompany.brand_header_image_url,
            useCustomHeader: settingsCompany.brand_use_custom_header
          })
          .from(settingsCompany)
          .limit(1)

        companySettings = settings
      } catch (e) {
        // If tenant DB access fails, use parent data
        console.error('Failed to fetch tenant company settings:', e)
      }
    }

    return {
      exists: true,
      tenant: {
        id: tenant.id,
        companyName: companySettings?.companyName || tenant.companyName,
        companySlug: tenant.companySlug,
        tagline: companySettings?.tagline || null,
        logoUrl: companySettings?.logoUrl || tenant.logoUrl,
        headerImageUrl: companySettings?.headerImageUrl || null,
        useCustomHeader: companySettings?.useCustomHeader || false,
        industry: tenant.industry
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching tenant:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch workspace'
    })
  }
})
