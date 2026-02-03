import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  if (!body.email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  const parentDb = useParentDb()

  try {
    // First, get the tenant's connection string from parent DB
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

    // Connect to tenant database and look up user
    const tenantDb = useTenantDb(tenant.connectionString)

    const [user] = await tenantDb
      .select({
        id: coreUsers.meta_id,
        firstName: coreUsers.personal_first_name,
        lastName: coreUsers.personal_last_name,
        email: coreUsers.personal_email,
        avatarUrl: coreUsers.personal_avatar_url,
        status: coreUsers.meta_status
      })
      .from(coreUsers)
      .where(eq(coreUsers.personal_email, body.email.toLowerCase()))
      .limit(1)

    if (!user) {
      return {
        exists: false,
        user: null
      }
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This account is currently inactive'
      })
    }

    return {
      exists: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error looking up user:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to look up user'
    })
  }
})
