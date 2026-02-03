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
        // Personal info
        firstName: coreUsers.personal_first_name,
        preferredName: coreUsers.personal_preferred_name,
        lastName: coreUsers.personal_last_name,
        maidenName: coreUsers.personal_maiden_name,
        email: coreUsers.personal_email,
        phone: coreUsers.personal_phone,
        phoneCountryCode: coreUsers.personal_phone_country_code,
        avatarUrl: coreUsers.personal_avatar_url,
        dateOfBirth: coreUsers.personal_date_of_birth,
        gender: coreUsers.personal_gender,
        nationality: coreUsers.personal_nationality,
        ssn: coreUsers.personal_ssn,

        // Personal address
        personalCountry: coreUsers.personal_address_country_code,
        personalState: coreUsers.personal_address_state_code,
        personalCity: coreUsers.personal_address_city,
        personalAddress: coreUsers.personal_address_line1,
        personalAddress2: coreUsers.personal_address_line2,
        personalZip: coreUsers.personal_address_postal_code,

        // Emergency contact
        emergencyContactName: coreUsers.emergency_contact_name,
        emergencyContactRelationship: coreUsers.emergency_contact_relationship,
        emergencyContactPhone: coreUsers.emergency_contact_phone,
        emergencyContactEmail: coreUsers.emergency_contact_email,
        emergencyContactAddress: coreUsers.emergency_contact_address,

        // Company/employment info
        workEmail: coreUsers.company_email,
        workPhone: coreUsers.company_phone,
        workPhoneExt: coreUsers.company_phone_ext,
        title: coreUsers.company_title,
        department: coreUsers.company_department,
        division: coreUsers.company_division,
        location: coreUsers.company_location,
        employeeId: coreUsers.company_employee_id,
        startDate: coreUsers.company_start_date,
        employmentType: coreUsers.company_employment_type,
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
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || null,
        nationality: user.nationality || null,
        ssn: user.ssn || '',

        // Personal address
        personalCountry: user.personalCountry || 'US',
        personalState: user.personalState || '',
        personalCity: user.personalCity || '',
        personalAddress: user.personalAddress || '',
        personalAddress2: user.personalAddress2 || '',
        personalZip: user.personalZip || '',

        // Emergency contact
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactRelationship: user.emergencyContactRelationship || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
        emergencyContactEmail: user.emergencyContactEmail || '',
        emergencyContactAddress: user.emergencyContactAddress || '',

        // Employment
        workEmail: user.workEmail || user.email || '',
        workPhone: user.workPhone || '',
        workPhoneExt: user.workPhoneExt || '',
        title: user.title || '',
        department: user.department || '',
        division: user.division || '',
        location: user.location || '',
        employeeId: user.employeeId || '',
        startDate: user.startDate || '',
        employmentType: user.employmentType || 'full-time',
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
