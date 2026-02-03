import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const userId = query.userId as string

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'userId query parameter is required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Get tenant connection string from parent DB
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    if (tenant.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This workspace is currently inactive'
      })
    }

    if (!tenant.connectionString) {
      throw createError({
        statusCode: 500,
        message: 'Workspace database not configured'
      })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Fetch user profile with all personal and company fields
    const [user] = await tenantDb
      .select({
        // Personal info (editable by user)
        firstName: coreUsers.personal_first_name,
        preferredName: coreUsers.personal_preferred_name,
        lastName: coreUsers.personal_last_name,
        maidenName: coreUsers.personal_maiden_name,
        phone: coreUsers.personal_phone,
        phoneCountryCode: coreUsers.personal_phone_country_code,
        avatarUrl: coreUsers.personal_avatar_url,
        dateOfBirth: coreUsers.personal_date_of_birth,
        gender: coreUsers.personal_gender,
        nationality: coreUsers.personal_nationality,

        // Personal address (editable by user)
        addressLine1: coreUsers.personal_address_line1,
        addressLine2: coreUsers.personal_address_line2,
        addressCity: coreUsers.personal_address_city,
        addressStateCode: coreUsers.personal_address_state_code,
        addressPostalCode: coreUsers.personal_address_postal_code,
        addressCountryCode: coreUsers.personal_address_country_code,

        // Emergency contact (editable by user)
        emergencyContactName: coreUsers.emergency_contact_name,
        emergencyContactRelationship: coreUsers.emergency_contact_relationship,
        emergencyContactPhone: coreUsers.emergency_contact_phone,
        emergencyContactEmail: coreUsers.emergency_contact_email,
        emergencyContactAddress: coreUsers.emergency_contact_address,

        // Company info (read-only, managed by admin)
        companyEmail: coreUsers.company_email,
        companyPhone: coreUsers.company_phone,
        companyPhoneExt: coreUsers.company_phone_ext,
        companyDepartment: coreUsers.company_department,
        companyDivision: coreUsers.company_division,
        companyLocation: coreUsers.company_location,
        companyTitle: coreUsers.company_title,
        companyEmployeeId: coreUsers.company_employee_id,
        companyStartDate: coreUsers.company_start_date,
        companyHireDate: coreUsers.company_hire_date,
        companyEmploymentType: coreUsers.company_employment_type
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

    // Debug: Log what's coming from DB
    console.log('Profile GET - Raw user data:', {
      nationality: user.nationality,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      emergencyContactRelationship: user.emergencyContactRelationship
    })

    return {
      success: true,
      profile: {
        personal: {
          firstName: user.firstName || '',
          preferredName: user.preferredName || '',
          lastName: user.lastName || '',
          maidenName: user.maidenName || '',
          phone: user.phone || '',
          phoneCountryCode: user.phoneCountryCode || '+1',
          avatarUrl: user.avatarUrl || null,
          dateOfBirth: user.dateOfBirth || '',
          gender: user.gender || '',
          nationality: user.nationality || '',
          addressLine1: user.addressLine1 || '',
          addressLine2: user.addressLine2 || '',
          addressCity: user.addressCity || '',
          addressStateCode: user.addressStateCode || '',
          addressPostalCode: user.addressPostalCode || '',
          addressCountryCode: user.addressCountryCode || 'US',
          emergencyContactName: user.emergencyContactName || '',
          emergencyContactRelationship: user.emergencyContactRelationship || '',
          emergencyContactPhone: user.emergencyContactPhone || '',
          emergencyContactEmail: user.emergencyContactEmail || '',
          emergencyContactAddress: user.emergencyContactAddress || ''
        },
        company: {
          email: user.companyEmail || '',
          phone: user.companyPhone || '',
          phoneExt: user.companyPhoneExt || '',
          department: user.companyDepartment || '',
          division: user.companyDivision || '',
          location: user.companyLocation || '',
          title: user.companyTitle || '',
          employeeId: user.companyEmployeeId || '',
          startDate: user.companyStartDate || '',
          hireDate: user.companyHireDate || '',
          employmentType: user.companyEmploymentType || ''
        }
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching user profile:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch user profile'
    })
  }
})
