<script setup lang="ts">
/**
 * NeuActionButton - Permission-aware action button
 *
 * Extends NeuButton with built-in permission checking.
 * Automatically disables or hides the button based on user permissions.
 *
 * Usage:
 *   <NeuActionButton
 *     permission="users.edit.personal.self"
 *     @click="handleEdit"
 *   >
 *     Edit Profile
 *   </NeuActionButton>
 */

import type { PermissionCode } from '~/types/permissions'

interface Props {
  /** Permission required to enable the button */
  permission?: PermissionCode
  /** Multiple permissions to check */
  permissions?: PermissionCode[]
  /** Whether to require 'all' or 'any' of the permissions (default: 'all') */
  require?: 'all' | 'any'
  /** Role required to enable the button */
  role?: string
  /** Context for permission checking */
  context?: {
    targetUserId?: string
    targetDepartmentId?: string
  }
  /** Behavior when not permitted: 'disable' or 'hide' (default: 'disable') */
  deniedBehavior?: 'disable' | 'hide'
  /** Tooltip to show when disabled due to permissions */
  deniedTooltip?: string

  // NeuButton props
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  require: 'all',
  deniedBehavior: 'disable',
  deniedTooltip: 'You do not have permission for this action',
  variant: 'default',
  size: 'md',
  disabled: false,
  loading: false,
  rounded: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { can, canAny, canAll, hasRole, isLoaded } = usePermissions()

const hasPermission = computed(() => {
  // Wait for permissions to load
  if (!isLoaded.value) {
    return false
  }

  // No permission specified - allow by default
  if (!props.permission && !props.permissions && !props.role) {
    return true
  }

  // Check single permission
  if (props.permission) {
    return can(props.permission, props.context)
  }

  // Check multiple permissions
  if (props.permissions && props.permissions.length > 0) {
    if (props.require === 'any') {
      return canAny(props.permissions, props.context)
    }
    return canAll(props.permissions, props.context)
  }

  // Check role
  if (props.role) {
    return hasRole(props.role)
  }

  return true
})

const isVisible = computed(() => {
  if (props.deniedBehavior === 'hide') {
    return hasPermission.value
  }
  return true
})

const isDisabled = computed(() => {
  return props.disabled || props.loading || !hasPermission.value
})

const showTooltip = computed(() => {
  return !hasPermission.value && props.deniedBehavior === 'disable'
})

function handleClick(event: MouseEvent) {
  if (!isDisabled.value) {
    emit('click', event)
  }
}
</script>

<template>
  <NeuButton
    v-if="isVisible"
    :variant="variant"
    :size="size"
    :disabled="isDisabled"
    :loading="loading"
    :rounded="rounded"
    :title="showTooltip ? deniedTooltip : undefined"
    @click="handleClick"
  >
    <slot />
  </NeuButton>
</template>
