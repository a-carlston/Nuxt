/**
 * Composable for handling RBAC permissions.
 *
 * Provides permission checking, role verification, and organizational context
 * for the frontend. Automatically fetches permissions on auth and polls for updates.
 */

import type {
  PermissionCode,
  PermissionScope,
  DataLevel,
  OrgContext,
  FrontendPermissionState,
} from '~/types/permissions'
import {
  SCOPE_ORDER,
  DATA_LEVEL_ORDER,
  parsePermission,
  scopeIncludes,
  dataLevelIncludes,
  PERMISSION_CACHE_TTL,
  PERMISSION_POLL_INTERVAL,
} from '~/constants/permissions'

interface PermissionCheckContext {
  targetUserId?: string
  targetDepartmentId?: string
  targetLobId?: string
  targetDivisionId?: string
  targetLocationId?: string
}

export function usePermissions() {
  const { isAuthenticated, user, tenant } = useAuth()

  // Permission state (uses useState for SSR hydration)
  const permissionState = useState<FrontendPermissionState>('permission-state', () => ({
    loaded: false,
    loading: false,
    permissions: [],
    roles: [],
    tags: [],
    orgContext: {
      userId: '',
      departmentIds: [],
      lobIds: [],
      divisionIds: [],
      locationIds: [],
      directReportIds: [],
      supervisorIds: [],
    },
  }))

  // Polling interval reference
  let pollInterval: ReturnType<typeof setInterval> | null = null

  // Computed properties
  const isLoaded = computed(() => permissionState.value.loaded)
  const isLoading = computed(() => permissionState.value.loading)
  const permissions = computed(() => new Set(permissionState.value.permissions))
  const roles = computed(() => permissionState.value.roles)
  const tags = computed(() => permissionState.value.tags)
  const orgContext = computed(() => permissionState.value.orgContext)

  // Role-based computed properties
  const isAdmin = computed(() => {
    const adminRoles = ['super_admin', 'admin']
    return permissionState.value.roles.some((r) => adminRoles.includes(r))
  })

  const isSuperAdmin = computed(() => {
    return permissionState.value.roles.includes('super_admin')
  })

  const isManager = computed(() => {
    const managerRoles = ['super_admin', 'admin', 'hr_manager', 'manager']
    return permissionState.value.roles.some((r) => managerRoles.includes(r))
  })

  const hasDirectReports = computed(() => {
    return permissionState.value.orgContext.directReportIds.length > 0
  })

  /**
   * Fetch permissions from the server
   */
  async function fetchPermissions(): Promise<void> {
    if (!isAuthenticated.value || !tenant.value?.slug) {
      return
    }

    permissionState.value.loading = true

    try {
      // Forward cookies during SSR
      const headers: HeadersInit = {}
      if (import.meta.server) {
        const requestHeaders = useRequestHeaders(['cookie'])
        if (requestHeaders.cookie) {
          headers.cookie = requestHeaders.cookie
        }
      }

      const response = await $fetch<{
        success: boolean
        data: {
          permissions: string[]
          roles: Array<{ code: string; name: string; hierarchyLevel: number }>
          tags: string[]
          orgContext: OrgContext
          expiresAt: number
        }
      }>(`/api/tenant/${tenant.value.slug}/user/permissions`, {
        credentials: 'include',
        headers,
      })

      if (response.success) {
        permissionState.value = {
          loaded: true,
          loading: false,
          permissions: response.data.permissions,
          roles: response.data.roles.map((r) => r.code),
          tags: response.data.tags,
          orgContext: response.data.orgContext,
          loadedAt: Date.now(),
          expiresAt: response.data.expiresAt,
        }
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      permissionState.value.loading = false
    }
  }

  /**
   * Initialize permissions (call after login)
   */
  async function initPermissions(): Promise<void> {
    if (permissionState.value.loaded) {
      return
    }

    await fetchPermissions()
    startPolling()
  }

  /**
   * Clear permissions (call on logout)
   */
  function clearPermissions(): void {
    stopPolling()
    permissionState.value = {
      loaded: false,
      loading: false,
      permissions: [],
      roles: [],
      tags: [],
      orgContext: {
        userId: '',
        departmentIds: [],
        lobIds: [],
        divisionIds: [],
        locationIds: [],
        directReportIds: [],
        supervisorIds: [],
      },
    }
  }

  /**
   * Start polling for permission updates
   */
  function startPolling(): void {
    if (import.meta.server) return
    if (pollInterval) return

    pollInterval = setInterval(() => {
      if (isAuthenticated.value) {
        fetchPermissions()
      }
    }, PERMISSION_POLL_INTERVAL)
  }

  /**
   * Stop polling
   */
  function stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  /**
   * Check if user has a specific permission
   */
  function can(permission: PermissionCode, context?: PermissionCheckContext): boolean {
    if (!permissionState.value.loaded) {
      return false
    }

    const parsed = parsePermission(permission)

    // Build permission variations to check (cascade from specific to general)
    const permutations = buildPermissionPermutations(parsed, context)

    // Check if any permission matches
    const perms = permissions.value
    return permutations.some((p) => {
      // Direct match
      if (perms.has(p)) return true

      // Wildcard match
      const wildcardPattern = p.replace(/\.[^.]+$/, '.*')
      if (perms.has(wildcardPattern)) return true

      return false
    })
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  function canAny(perms: PermissionCode[], context?: PermissionCheckContext): boolean {
    return perms.some((p) => can(p, context))
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  function canAll(perms: PermissionCode[], context?: PermissionCheckContext): boolean {
    return perms.every((p) => can(p, context))
  }

  /**
   * Check if user has a specific role
   */
  function hasRole(roleCode: string): boolean {
    return permissionState.value.roles.includes(roleCode)
  }

  /**
   * Check if user has ANY of the specified roles
   */
  function hasAnyRole(roleCodes: string[]): boolean {
    return roleCodes.some((r) => permissionState.value.roles.includes(r))
  }

  /**
   * Check if user has a specific tag
   */
  function hasTag(tag: string): boolean {
    return permissionState.value.tags.includes(tag)
  }

  /**
   * Check if target user is self
   */
  function isSelf(targetUserId: string): boolean {
    return permissionState.value.orgContext.userId === targetUserId
  }

  /**
   * Check if target user is a direct report
   */
  function isDirectReport(targetUserId: string): boolean {
    return permissionState.value.orgContext.directReportIds.includes(targetUserId)
  }

  /**
   * Check if user is in the same department as target
   */
  function isInSameDepartment(targetDepartmentId: string): boolean {
    return permissionState.value.orgContext.departmentIds.includes(targetDepartmentId)
  }

  /**
   * Get the effective scope for a permission
   */
  function getEffectiveScope(
    resource: string,
    action: string,
    context?: PermissionCheckContext
  ): PermissionScope | null {
    const scopesHighToLow: PermissionScope[] = ['company', 'division', 'lob', 'department', 'direct_reports', 'self']

    for (const scope of scopesHighToLow) {
      const permission = `${resource}.${action}.${scope}`
      if (can(permission, context)) {
        return scope
      }
    }

    return null
  }

  /**
   * Get the maximum data level the user can access for a target
   */
  function getMaxDataLevel(
    resource: string,
    action: string,
    context?: PermissionCheckContext
  ): DataLevel | null {
    const levelsHighToLow: DataLevel[] = ['sensitive', 'personal', 'basic']

    for (const level of levelsHighToLow) {
      const permission = `${resource}.${action}.${level}`
      if (can(permission, context)) {
        return level
      }
    }

    return null
  }

  /**
   * Build permission permutations for cascade checking
   */
  function buildPermissionPermutations(
    parsed: ReturnType<typeof parsePermission>,
    context?: PermissionCheckContext
  ): string[] {
    const permutations: string[] = []

    // Determine applicable scopes based on context
    let applicableScopes: PermissionScope[] = [...SCOPE_ORDER]

    if (context) {
      // Filter scopes based on relationship to target
      if (context.targetUserId) {
        if (isSelf(context.targetUserId)) {
          // Can use self or higher scope
          applicableScopes = SCOPE_ORDER.slice(SCOPE_ORDER.indexOf('self'))
        } else if (isDirectReport(context.targetUserId)) {
          // Can use direct_reports or higher scope
          applicableScopes = SCOPE_ORDER.slice(SCOPE_ORDER.indexOf('direct_reports'))
        } else if (context.targetDepartmentId && isInSameDepartment(context.targetDepartmentId)) {
          // Can use department or higher scope
          applicableScopes = SCOPE_ORDER.slice(SCOPE_ORDER.indexOf('department'))
        } else {
          // Need company scope for unrelated users
          applicableScopes = ['company']
        }
      }
    }

    // Build permutations from specific to general
    for (const scope of applicableScopes.reverse()) {
      if (parsed.dataLevel) {
        // With data level
        for (const dataLevel of DATA_LEVEL_ORDER.slice(DATA_LEVEL_ORDER.indexOf(parsed.dataLevel)).reverse()) {
          permutations.push(`${parsed.resource}.${parsed.action}.${dataLevel}.${scope}`)
        }
      }
      permutations.push(`${parsed.resource}.${parsed.action}.${scope}`)
    }

    // Without scope
    if (parsed.dataLevel) {
      for (const dataLevel of DATA_LEVEL_ORDER.slice(DATA_LEVEL_ORDER.indexOf(parsed.dataLevel)).reverse()) {
        permutations.push(`${parsed.resource}.${parsed.action}.${dataLevel}`)
      }
    }

    // Most general
    permutations.push(`${parsed.resource}.${parsed.action}`)

    return permutations
  }

  // Auto-init on client when auth is ready
  if (import.meta.client) {
    watch(
      () => isAuthenticated.value,
      (authenticated) => {
        if (authenticated && !permissionState.value.loaded) {
          initPermissions()
        } else if (!authenticated) {
          clearPermissions()
        }
      },
      { immediate: true }
    )
  }

  return {
    // State
    permissionState: readonly(permissionState),
    isLoaded,
    isLoading,
    permissions,
    roles,
    tags,
    orgContext,

    // Role-based computed
    isAdmin,
    isSuperAdmin,
    isManager,
    hasDirectReports,

    // Actions
    fetchPermissions,
    initPermissions,
    clearPermissions,

    // Permission checking
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole,
    hasTag,
    isSelf,
    isDirectReport,
    isInSameDepartment,
    getEffectiveScope,
    getMaxDataLevel,
  }
}
