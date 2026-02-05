/**
 * Composable for handling authentication state and operations.
 * Uses HTTP-only cookies for secure session management.
 */

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export interface AuthTenant {
  id: string
  slug: string
}

export interface AuthState {
  authenticated: boolean
  user: AuthUser | null
  tenant: AuthTenant | null
}

interface LoginCredentials {
  slug: string
  email: string
  password: string
  rememberMe?: boolean
}

interface LoginResponse {
  success: boolean
  onboardingCompleted: boolean
  user: AuthUser
  tenant: AuthTenant
}

export function useAuth() {
  // Shared auth state across the app
  const authState = useState<AuthState>('auth-state', () => ({
    authenticated: false,
    user: null,
    tenant: null
  }))

  const isLoading = useState<boolean>('auth-loading', () => false)
  const isInitialized = useState<boolean>('auth-initialized', () => false)

  // Computed properties for easy access
  const isAuthenticated = computed(() => authState.value.authenticated)
  const user = computed(() => authState.value.user)
  const tenant = computed(() => authState.value.tenant)

  /**
   * Fetch current session from the server
   */
  async function fetchSession(): Promise<AuthState> {
    try {
      // During SSR, forward cookies from the original request
      const headers: HeadersInit = {}
      if (import.meta.server) {
        const requestHeaders = useRequestHeaders(['cookie'])
        if (requestHeaders.cookie) {
          headers.cookie = requestHeaders.cookie
        }
      }

      const response = await $fetch<AuthState>('/api/auth/session', {
        credentials: 'include',
        headers
      })

      authState.value = {
        authenticated: response.authenticated,
        user: response.user,
        tenant: response.tenant
      }

      return authState.value
    } catch (error) {
      console.error('Failed to fetch session:', error)
      authState.value = {
        authenticated: false,
        user: null,
        tenant: null
      }
      return authState.value
    }
  }

  /**
   * Initialize auth state on app load
   */
  async function initAuth(): Promise<AuthState> {
    if (isInitialized.value) {
      return authState.value
    }

    isLoading.value = true
    try {
      await fetchSession()
      isInitialized.value = true
      return authState.value
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with credentials
   */
  async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    isLoading.value = true
    try {
      const response = await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: credentials,
        credentials: 'include'
      })

      if (response.success) {
        authState.value = {
          authenticated: true,
          user: response.user,
          tenant: response.tenant
        }
      }

      return response
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout and clear session
   */
  async function logout(): Promise<void> {
    isLoading.value = true
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authState.value = {
        authenticated: false,
        user: null,
        tenant: null
      }
      isLoading.value = false

      // Clear permission state on logout
      try {
        const { clearPermissions } = usePermissions()
        clearPermissions()
      } catch {
        // Permissions composable may not be initialized
      }
    }
  }

  /**
   * Check if user has access to a specific tenant
   */
  function hasAccessToTenant(slug: string): boolean {
    return authState.value.authenticated && authState.value.tenant?.slug === slug
  }

  /**
   * Get user initials for avatar fallback
   */
  const userInitials = computed(() => {
    if (!authState.value.user) return ''
    const { firstName, lastName } = authState.value.user
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  })

  /**
   * Get full display name
   */
  const displayName = computed(() => {
    if (!authState.value.user) return ''
    return `${authState.value.user.firstName} ${authState.value.user.lastName}`.trim()
  })

  return {
    // State (readonly for external use)
    authState: readonly(authState),
    isAuthenticated,
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    user,
    tenant,
    userInitials,
    displayName,

    // Actions
    initAuth,
    fetchSession,
    login,
    logout,
    hasAccessToTenant
  }
}
