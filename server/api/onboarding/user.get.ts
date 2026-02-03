import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug as string
  const userId = query.userId as string

  if (!slug || !userId) {
    throw createError({
      statusCode: 400,
      message: 'Slug and userId are required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Get tenant connection string
    const [tenant] = await parentDb
      .select({
        id: parentSchema.parentTenants.meta_id,
        connectionString: parentSchema.parentTenants.connection_string
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant || !tenant.connectionString) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    // Connect to tenant database and get user data
    const tenantDb = useTenantDb(tenant.connectionString)

    const [user] = await tenantDb
      .select({
        id: coreUsers.meta_id,
        // Personal info (from registration)
        firstName: coreUsers.personal_first_name,
        preferredName: coreUsers.personal_preferred_name,
        lastName: coreUsers.personal_last_name,
        maidenName: coreUsers.personal_maiden_name,
        email: coreUsers.personal_email,
        phone: coreUsers.personal_phone,
        phoneCountryCode: coreUsers.personal_phone_country_code,
        avatarUrl: coreUsers.personal_avatar_url,
        // Personal address (from registration)
        personalCountry: coreUsers.personal_address_country_code,
        personalState: coreUsers.personal_address_state_code,
        personalCity: coreUsers.personal_address_city,
        personalAddress: coreUsers.personal_address_line1,
        personalAddress2: coreUsers.personal_address_line2,
        personalZip: coreUsers.personal_address_postal_code,
        // Additional personal info (may be empty)
        dateOfBirth: coreUsers.personal_date_of_birth,
        gender: coreUsers.personal_gender,
        // Company/employment info
        workEmail: coreUsers.company_email,
        title: coreUsers.company_title,
      })
      .from(coreUsers)
      .where(eq(coreUsers.meta_id, userId))
      .limit(1)

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    return {
      success: true,
      user: {
        id: user.id,
        // Personal info
        firstName: user.firstName || '',
        preferredName: user.preferredName || '',
        lastName: user.lastName || '',
        maidenName: user.maidenName || '',
        email: user.email || '',
        phone: user.phone || '',
        phoneCountryCode: user.phoneCountryCode || '',
        avatarUrl: user.avatarUrl,
        // Personal address
        personalCountry: user.personalCountry || 'US',
        personalState: user.personalState || '',
        personalCity: user.personalCity || '',
        personalAddress: user.personalAddress || '',
        personalAddress2: user.personalAddress2 || '',
        personalZip: user.personalZip || '',
        // Additional (may be empty - to be filled in onboarding)
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || null,
        // Employment
        workEmail: user.workEmail || user.email || '',
        title: user.title || '',
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching user for onboarding:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to load user data'
    })
  }
})
