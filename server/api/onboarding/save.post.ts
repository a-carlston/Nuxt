import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers, coreUserBanking } from '../../db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.slug || !body.userId) {
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
      .where(eq(parentSchema.parentTenants.info_company_slug, body.slug.toLowerCase()))
      .limit(1)

    if (!tenant || !tenant.connectionString) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Build update object based on provided data
    const updateData: Record<string, any> = {
      meta_updated_at: new Date()
    }

    // Personal info
    if (body.data.firstName !== undefined) updateData.personal_first_name = body.data.firstName
    if (body.data.preferredName !== undefined) updateData.personal_preferred_name = body.data.preferredName
    if (body.data.lastName !== undefined) updateData.personal_last_name = body.data.lastName
    if (body.data.maidenName !== undefined) updateData.personal_maiden_name = body.data.maidenName
    if (body.data.phone !== undefined) updateData.personal_phone = body.data.phone
    if (body.data.phoneCountryCode !== undefined) updateData.personal_phone_country_code = body.data.phoneCountryCode
    if (body.data.dateOfBirth !== undefined) updateData.personal_date_of_birth = body.data.dateOfBirth || null
    if (body.data.gender !== undefined) updateData.personal_gender = body.data.gender
    if (body.data.nationality !== undefined) updateData.personal_nationality = body.data.nationality
    if (body.data.ssn !== undefined) updateData.personal_ssn = body.data.ssn

    // Personal address
    if (body.data.personalCountry !== undefined) updateData.personal_address_country_code = body.data.personalCountry
    if (body.data.personalState !== undefined) updateData.personal_address_state_code = body.data.personalState
    if (body.data.personalCity !== undefined) updateData.personal_address_city = body.data.personalCity
    if (body.data.personalAddress !== undefined) updateData.personal_address_line1 = body.data.personalAddress
    if (body.data.personalAddress2 !== undefined) updateData.personal_address_line2 = body.data.personalAddress2
    if (body.data.personalZip !== undefined) updateData.personal_address_postal_code = body.data.personalZip

    // Emergency contact
    if (body.data.emergencyContactName !== undefined) updateData.emergency_contact_name = body.data.emergencyContactName
    if (body.data.emergencyContactRelationship !== undefined) updateData.emergency_contact_relationship = body.data.emergencyContactRelationship
    if (body.data.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = body.data.emergencyContactPhone
    if (body.data.emergencyContactEmail !== undefined) updateData.emergency_contact_email = body.data.emergencyContactEmail
    if (body.data.emergencyContactAddress !== undefined) updateData.emergency_contact_address = body.data.emergencyContactAddress

    // Employment
    if (body.data.title !== undefined) updateData.company_title = body.data.title
    if (body.data.department !== undefined) updateData.company_department = body.data.department
    if (body.data.division !== undefined) updateData.company_division = body.data.division
    if (body.data.location !== undefined) updateData.company_location = body.data.location
    if (body.data.workEmail !== undefined) updateData.company_email = body.data.workEmail
    if (body.data.workPhone !== undefined) updateData.company_phone = body.data.workPhone
    if (body.data.workPhoneExt !== undefined) updateData.company_phone_ext = body.data.workPhoneExt
    if (body.data.startDate !== undefined) updateData.company_start_date = body.data.startDate || null
    if (body.data.employmentType !== undefined) updateData.company_employment_type = body.data.employmentType
    if (body.data.employeeId !== undefined) updateData.company_employee_id = body.data.employeeId

    // Update user
    await tenantDb
      .update(coreUsers)
      .set(updateData)
      .where(eq(coreUsers.meta_id, body.userId))

    // Handle banking separately (goes to coreUserBanking table)
    const hasBankingData = body.data.bankName && body.data.bankRoutingNumber && body.data.bankAccountNumber
    if (hasBankingData) {
      // Get user info for account holder name
      const [user] = await tenantDb
        .select({
          firstName: coreUsers.personal_first_name,
          lastName: coreUsers.personal_last_name
        })
        .from(coreUsers)
        .where(eq(coreUsers.meta_id, body.userId))
        .limit(1)

      // Check if banking record already exists
      const [existingBanking] = await tenantDb
        .select({ id: coreUserBanking.meta_id })
        .from(coreUserBanking)
        .where(eq(coreUserBanking.ref_user_id, body.userId))
        .limit(1)

      if (existingBanking) {
        // Update existing banking info
        await tenantDb
          .update(coreUserBanking)
          .set({
            bank_name: body.data.bankName,
            bank_account_type: body.data.bankAccountType || 'checking',
            bank_routing_number: body.data.bankRoutingNumber,
            bank_account_number: body.data.bankAccountNumber,
            bank_account_holder_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            meta_updated_at: new Date()
          })
          .where(eq(coreUserBanking.ref_user_id, body.userId))
      } else {
        // Insert new banking info
        await tenantDb.insert(coreUserBanking).values({
          ref_user_id: body.userId,
          bank_name: body.data.bankName,
          bank_account_type: body.data.bankAccountType || 'checking',
          bank_routing_number: body.data.bankRoutingNumber,
          bank_account_number: body.data.bankAccountNumber,
          bank_account_holder_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          config_is_primary: true
        })
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Onboarding save error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to save onboarding data'
    })
  }
})
