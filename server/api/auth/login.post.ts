import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../db'

// Simple password hashing (must match registration)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'optivo-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.slug || !body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Slug, email, and password are required'
    })
  }

  const parentDb = useParentDb()

  try {
    // Get tenant connection string
    const [tenant] = await parentDb
      .select({
        id: parentSchema.parentTenants.meta_id,
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, body.slug.toLowerCase()))
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

    // Look up user by email
    const [user] = await tenantDb
      .select({
        id: coreUsers.meta_id,
        firstName: coreUsers.personal_first_name,
        lastName: coreUsers.personal_last_name,
        email: coreUsers.personal_email,
        passwordHash: coreUsers.auth_password_hash,
        status: coreUsers.meta_status,
        avatarUrl: coreUsers.personal_avatar_url,
        onboardingCompletedAt: coreUsers.auth_onboarding_completed_at
      })
      .from(coreUsers)
      .where(eq(coreUsers.personal_email, body.email.toLowerCase()))
      .limit(1)

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Invalid email or password'
      })
    }

    if (user.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This account is currently inactive'
      })
    }

    // Verify password
    const passwordHash = await hashPassword(body.password)

    if (passwordHash !== user.passwordHash) {
      throw createError({
        statusCode: 401,
        message: 'Invalid email or password'
      })
    }

    // TODO: Create session/JWT token
    // For now, we'll just return success
    // In production, you'd want to:
    // 1. Create a session in the database
    // 2. Set an HTTP-only cookie with session ID or JWT
    // 3. Include CSRF protection

    // Log the login in parent audit logs (don't let this break login)
    try {
      await parentDb.insert(parentSchema.parentAuditLogs).values({
        ref_tenant_id: tenant.id,
        actor_type: 'user',
        actor_id: user.id,
        actor_email: user.email,
        action: 'user.login',
        resource_type: 'session',
        resource_id: user.id,
        description: `User ${user.email} logged in`
      })
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }

    return {
      success: true,
      onboardingCompleted: !!user.onboardingCompletedAt,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      tenant: {
        id: tenant.id,
        slug: body.slug
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Login error:', error)
    throw createError({
      statusCode: 500,
      message: 'Login failed. Please try again.'
    })
  }
})
