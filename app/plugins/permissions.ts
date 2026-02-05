/**
 * Permissions Plugin
 *
 * Registers the v-can and v-cannot directives for conditional rendering
 * based on user permissions.
 *
 * Usage:
 *   <button v-can="'users.edit.personal.self'">Edit</button>
 *   <div v-can="{ permission: 'users.view.sensitive.company' }">Sensitive Data</div>
 *   <span v-cannot="'rbac.manage'">You cannot manage roles</span>
 */

import type { DirectiveBinding, ObjectDirective } from 'vue'
import type { PermissionCode } from '~/types/permissions'

interface PermissionDirectiveValue {
  permission?: PermissionCode
  permissions?: PermissionCode[]
  require?: 'all' | 'any'
  role?: string
  roles?: string[]
  context?: {
    targetUserId?: string
    targetDepartmentId?: string
  }
}

type DirectiveValue = PermissionCode | PermissionDirectiveValue

function parseDirectiveValue(value: DirectiveValue): PermissionDirectiveValue {
  if (typeof value === 'string') {
    return { permission: value }
  }
  return value
}

function checkPermission(
  value: DirectiveValue,
  can: (p: PermissionCode, ctx?: object) => boolean,
  canAny: (p: PermissionCode[], ctx?: object) => boolean,
  canAll: (p: PermissionCode[], ctx?: object) => boolean,
  hasRole: (r: string) => boolean,
  hasAnyRole: (r: string[]) => boolean
): boolean {
  const config = parseDirectiveValue(value)

  // Check single permission
  if (config.permission) {
    return can(config.permission, config.context)
  }

  // Check multiple permissions
  if (config.permissions && config.permissions.length > 0) {
    if (config.require === 'any') {
      return canAny(config.permissions, config.context)
    }
    return canAll(config.permissions, config.context)
  }

  // Check single role
  if (config.role) {
    return hasRole(config.role)
  }

  // Check multiple roles
  if (config.roles && config.roles.length > 0) {
    return hasAnyRole(config.roles)
  }

  // No permission specified - allow
  return true
}

export default defineNuxtPlugin((nuxtApp) => {
  // Store original display values
  const originalDisplayMap = new WeakMap<HTMLElement, string>()

  // v-can directive - show element when user has permission
  const vCan: ObjectDirective<HTMLElement, DirectiveValue> = {
    mounted(el, binding) {
      updateVisibility(el, binding, false)
    },
    updated(el, binding) {
      updateVisibility(el, binding, false)
    },
  }

  // v-cannot directive - show element when user does NOT have permission
  const vCannot: ObjectDirective<HTMLElement, DirectiveValue> = {
    mounted(el, binding) {
      updateVisibility(el, binding, true)
    },
    updated(el, binding) {
      updateVisibility(el, binding, true)
    },
  }

  function updateVisibility(
    el: HTMLElement,
    binding: DirectiveBinding<DirectiveValue>,
    invert: boolean
  ) {
    const { can, canAny, canAll, hasRole, hasAnyRole, isLoaded } = usePermissions()

    // Store original display if not stored yet
    if (!originalDisplayMap.has(el)) {
      originalDisplayMap.set(el, el.style.display || '')
    }

    // If permissions not loaded yet, hide element
    if (!isLoaded.value) {
      el.style.display = 'none'
      return
    }

    const allowed = checkPermission(
      binding.value,
      can,
      canAny,
      canAll,
      hasRole,
      hasAnyRole
    )

    const shouldShow = invert ? !allowed : allowed

    if (shouldShow) {
      el.style.display = originalDisplayMap.get(el) || ''
    } else {
      el.style.display = 'none'
    }
  }

  // Register directives
  nuxtApp.vueApp.directive('can', vCan)
  nuxtApp.vueApp.directive('cannot', vCannot)

  // Also provide permission helpers to the app
  return {
    provide: {
      permissions: {
        can: (permission: PermissionCode, context?: object) => {
          const { can } = usePermissions()
          return can(permission, context)
        },
        canAny: (permissions: PermissionCode[], context?: object) => {
          const { canAny } = usePermissions()
          return canAny(permissions, context)
        },
        canAll: (permissions: PermissionCode[], context?: object) => {
          const { canAll } = usePermissions()
          return canAll(permissions, context)
        },
        hasRole: (role: string) => {
          const { hasRole } = usePermissions()
          return hasRole(role)
        },
        hasAnyRole: (roles: string[]) => {
          const { hasAnyRole } = usePermissions()
          return hasAnyRole(roles)
        },
      },
    },
  }
})
