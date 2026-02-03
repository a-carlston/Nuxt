import { eq, and, or, like, asc, desc, sql, isNull } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../../db'

// Allowed columns for filtering
const FILTERABLE_COLUMNS = [
  'meta_status',
  'personal_first_name',
  'personal_last_name',
  'personal_email',
  'personal_phone',
  'company_department',
  'company_division',
  'company_location',
  'company_title'
] as const

// Allowed columns for sorting
const SORTABLE_COLUMNS = [
  'meta_id',
  'meta_status',
  'meta_created_at',
  'meta_updated_at',
  'personal_first_name',
  'personal_last_name',
  'personal_email',
  'company_department',
  'company_division',
  'company_location',
  'company_title',
  'company_start_date',
  'company_hire_date'
] as const

// Mapping from frontend camelCase to database snake_case column names
const SORT_COLUMN_MAP: Record<string, SortableColumn> = {
  // Meta fields
  id: 'meta_id',
  status: 'meta_status',
  createdAt: 'meta_created_at',
  updatedAt: 'meta_updated_at',
  // Personal fields
  firstName: 'personal_first_name',
  lastName: 'personal_last_name',
  email: 'personal_email',
  // Company fields
  department: 'company_department',
  division: 'company_division',
  location: 'company_location',
  title: 'company_title',
  startDate: 'company_start_date',
  hireDate: 'company_hire_date'
}

// Mapping from frontend camelCase to database snake_case for filters
const FILTER_COLUMN_MAP: Record<string, FilterableColumn> = {
  status: 'meta_status',
  firstName: 'personal_first_name',
  lastName: 'personal_last_name',
  email: 'personal_email',
  phone: 'personal_phone',
  department: 'company_department',
  division: 'company_division',
  location: 'company_location',
  title: 'company_title'
}

type FilterableColumn = typeof FILTERABLE_COLUMNS[number]
type SortableColumn = typeof SORTABLE_COLUMNS[number]

interface QueryFilters {
  [key: string]: string
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  // Parse query parameters
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || 20))
  const sortByParam = (query.sortBy as string) || 'meta_created_at'
  const sortOrder = ((query.sortOrder as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
  const search = (query.search as string) || ''

  // Map camelCase sortBy to snake_case column name (if mapping exists)
  // This allows frontend to send either "lastName" or "personal_last_name"
  const sortBy: SortableColumn = SORT_COLUMN_MAP[sortByParam] || sortByParam as SortableColumn

  // Parse filters from JSON string
  let filters: QueryFilters = {}
  if (query.filters) {
    try {
      filters = JSON.parse(query.filters as string)
    } catch {
      throw createError({
        statusCode: 400,
        message: 'Invalid filters format. Expected JSON string.'
      })
    }
  }

  // Validate sortBy column
  if (!SORTABLE_COLUMNS.includes(sortBy)) {
    throw createError({
      statusCode: 400,
      message: `Invalid sortBy column. Allowed: ${SORTABLE_COLUMNS.join(', ')} or camelCase equivalents: ${Object.keys(SORT_COLUMN_MAP).join(', ')}`
    })
  }

  // Map camelCase filter keys to snake_case and validate
  const mappedFilters: QueryFilters = {}
  for (const [key, value] of Object.entries(filters)) {
    // Map camelCase to snake_case if mapping exists, otherwise use as-is
    const mappedKey = FILTER_COLUMN_MAP[key] || key
    if (!FILTERABLE_COLUMNS.includes(mappedKey as FilterableColumn)) {
      throw createError({
        statusCode: 400,
        message: `Invalid filter column: ${key}. Allowed: ${Object.keys(FILTER_COLUMN_MAP).join(', ')} or ${FILTERABLE_COLUMNS.join(', ')}`
      })
    }
    mappedFilters[mappedKey] = value
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

    // Build conditions array
    const conditions = []

    // Exclude soft-deleted users
    conditions.push(isNull(coreUsers.meta_deleted_at))

    // Add filter conditions (using mapped filters)
    // Use exact match for status, LIKE for text columns
    const exactMatchColumns = ['meta_status']
    for (const [column, value] of Object.entries(mappedFilters)) {
      if (value !== undefined && value !== null && value !== '') {
        const columnRef = coreUsers[column as keyof typeof coreUsers]
        if (columnRef) {
          if (exactMatchColumns.includes(column)) {
            // Exact match for status/enum columns
            conditions.push(eq(columnRef as any, value))
          } else {
            // Partial match (LIKE) for text columns
            conditions.push(like(columnRef as any, `%${value}%`))
          }
        }
      }
    }

    // Add global search condition (searches across name, email, department)
    if (search) {
      const searchPattern = `%${search}%`
      conditions.push(
        or(
          like(coreUsers.personal_first_name, searchPattern),
          like(coreUsers.personal_last_name, searchPattern),
          like(coreUsers.personal_email, searchPattern),
          like(coreUsers.company_department, searchPattern)
        )
      )
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count for pagination
    const countResult = await tenantDb
      .select({ count: sql<number>`count(*)::int` })
      .from(coreUsers)
      .where(whereClause)

    const total = countResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)
    const offset = (page - 1) * pageSize

    // Build sort expression
    const sortColumn = coreUsers[sortBy as keyof typeof coreUsers]
    const orderExpression = sortOrder === 'asc' ? asc(sortColumn as any) : desc(sortColumn as any)

    // Fetch users with pagination
    const users = await tenantDb
      .select({
        id: coreUsers.meta_id,
        status: coreUsers.meta_status,
        createdAt: coreUsers.meta_created_at,
        updatedAt: coreUsers.meta_updated_at,
        firstName: coreUsers.personal_first_name,
        preferredName: coreUsers.personal_preferred_name,
        lastName: coreUsers.personal_last_name,
        email: coreUsers.personal_email,
        phone: coreUsers.personal_phone,
        avatarUrl: coreUsers.personal_avatar_url,
        companyEmail: coreUsers.company_email,
        companyPhone: coreUsers.company_phone,
        employeeId: coreUsers.company_employee_id,
        title: coreUsers.company_title,
        department: coreUsers.company_department,
        division: coreUsers.company_division,
        location: coreUsers.company_location,
        startDate: coreUsers.company_start_date,
        hireDate: coreUsers.company_hire_date,
        employmentType: coreUsers.company_employment_type,
        emailVerifiedAt: coreUsers.auth_email_verified_at,
        lastLoginAt: coreUsers.auth_last_login_at,
        mfaEnabled: coreUsers.auth_mfa_enabled,
        onboardingCompletedAt: coreUsers.auth_onboarding_completed_at
      })
      .from(coreUsers)
      .where(whereClause)
      .orderBy(orderExpression)
      .limit(pageSize)
      .offset(offset)

    return {
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching users:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch users'
    })
  }
})
