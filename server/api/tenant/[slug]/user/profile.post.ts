import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../../db'

interface ProfileUpdateBody {
  userId: string
  // Personal info
  firstName: string
  preferredName?: string
  lastName: string
  maidenName?: string
  phone?: string
  phoneCountryCode?: string
  avatarUrl?: string | null
  dateOfBirth?: string
  gender?: string
  nationality?: string
  // Personal address
  addressLine1?: string
  addressLine2?: string
  addressCity?: string
  addressStateCode?: string
  addressPostalCode?: string
  addressCountryCode?: string
  // Emergency contact
  emergencyContactName?: string
  emergencyContactRelationship?: string
  emergencyContactPhone?: string
  emergencyContactEmail?: string
  emergencyContactAddress?: string
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<ProfileUpdateBody>(event)

  // Debug: Log incoming request
  console.log('Profile POST - Request received:', {
    slug,
    userId: body.userId,
    firstName: body.firstName,
    lastName: body.lastName,
    nationality: body.nationality,
    emergencyContactName: body.emergencyContactName
  })

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!body.userId) {
    throw createError({
      statusCode: 400,
      message: 'userId is required'
    })
  }

  if (!body.firstName?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'First name is required'
    })
  }

  if (!body.lastName?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Last name is required'
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

    // Verify user exists
    const [existingUser] = await tenantDb
      .select({ id: coreUsers.meta_id })
      .from(coreUsers)
      .where(eq(coreUsers.meta_id, body.userId))
      .limit(1)

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Update user profile (only personal fields - company fields are read-only)
    try {
      await tenantDb
        .update(coreUsers)
        .set({
          // Personal info
          personal_first_name: body.firstName.trim(),
          personal_preferred_name: body.preferredName?.trim() || null,
          personal_last_name: body.lastName.trim(),
          personal_maiden_name: body.maidenName?.trim() || null,
          personal_phone: body.phone?.trim() || null,
          personal_phone_country_code: body.phoneCountryCode?.trim() || null,
          personal_avatar_url: body.avatarUrl || null,
          personal_date_of_birth: body.dateOfBirth || null,
          personal_gender: body.gender?.trim() || null,
          personal_nationality: body.nationality?.trim() || null,

          // Personal address
          personal_address_line1: body.addressLine1?.trim() || null,
          personal_address_line2: body.addressLine2?.trim() || null,
          personal_address_city: body.addressCity?.trim() || null,
          personal_address_state_code: body.addressStateCode?.trim() || null,
          personal_address_postal_code: body.addressPostalCode?.trim() || null,
          personal_address_country_code: body.addressCountryCode?.trim() || null,

          // Emergency contact
          emergency_contact_name: body.emergencyContactName?.trim() || null,
          emergency_contact_relationship: body.emergencyContactRelationship?.trim() || null,
          emergency_contact_phone: body.emergencyContactPhone?.trim() || null,
          emergency_contact_email: body.emergencyContactEmail?.trim() || null,
          emergency_contact_address: body.emergencyContactAddress?.trim() || null,

          meta_updated_at: new Date()
        })
        .where(eq(coreUsers.meta_id, body.userId))
    } catch (dbError: any) {
      console.error('Database update error:', dbError)
      console.error('Error code:', dbError.code)
      console.error('Error detail:', dbError.detail)
      console.error('Error constraint:', dbError.constraint)
      throw dbError
    }

    return {
      success: true,
      message: 'Profile updated successfully'
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating user profile:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    throw createError({
      statusCode: 500,
      message: `Failed to update user profile: ${error.message}`
    })
  }
})
