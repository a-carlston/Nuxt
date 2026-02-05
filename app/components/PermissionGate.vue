<script setup lang="ts">
/**
 * PermissionGate - Wrapper component for conditional rendering based on permissions
 *
 * Usage:
 *   <PermissionGate permission="users.edit.personal.self">
 *     <NeuButton>Edit Profile</NeuButton>
 *   </PermissionGate>
 *
 *   <PermissionGate :permissions="['users.create', 'users.delete']" require="any">
 *     <AdminPanel />
 *   </PermissionGate>
 */

import type { PermissionCode } from '~/types/permissions'

interface Props {
  /** Single permission to check */
  permission?: PermissionCode
  /** Multiple permissions to check */
  permissions?: PermissionCode[]
  /** Whether to require 'all' or 'any' of the permissions (default: 'all') */
  require?: 'all' | 'any'
  /** Role to check (alternative to permissions) */
  role?: string
  /** Multiple roles to check */
  roles?: string[]
  /** Context for permission checking */
  context?: {
    targetUserId?: string
    targetDepartmentId?: string
  }
  /** Show fallback content when denied */
  showFallback?: boolean
  /** Invert the check (show when permission is NOT granted) */
  invert?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  require: 'all',
  showFallback: false,
  invert: false,
})

const { can, canAny, canAll, hasRole, hasAnyRole, isLoaded } = usePermissions()

const isAllowed = computed(() => {
  // Wait for permissions to load
  if (!isLoaded.value) {
    return false
  }

  let allowed = false

  // Check single permission
  if (props.permission) {
    allowed = can(props.permission, props.context)
  }
  // Check multiple permissions
  else if (props.permissions && props.permissions.length > 0) {
    if (props.require === 'any') {
      allowed = canAny(props.permissions, props.context)
    } else {
      allowed = canAll(props.permissions, props.context)
    }
  }
  // Check single role
  else if (props.role) {
    allowed = hasRole(props.role)
  }
  // Check multiple roles (always ANY for roles)
  else if (props.roles && props.roles.length > 0) {
    allowed = hasAnyRole(props.roles)
  }
  // No permission/role specified - allow by default
  else {
    allowed = true
  }

  // Invert if needed
  return props.invert ? !allowed : allowed
})
</script>

<template>
  <slot v-if="isAllowed" />
  <slot v-else-if="showFallback" name="fallback">
    <!-- Default fallback: nothing -->
  </slot>
</template>
