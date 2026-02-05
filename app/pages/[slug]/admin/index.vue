<script setup lang="ts">
/**
 * Admin Overview Page
 *
 * Dashboard for admin settings with quick links to all admin sections.
 */

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

const adminSections = [
  {
    id: 'roles',
    title: 'Roles & Permissions',
    description: 'Manage user roles and what they can access',
    icon: 'shield',
    path: '/admin/roles',
    color: 'primary'
  },
  {
    id: 'fields',
    title: 'Field Manager',
    description: 'Configure field labels and data sensitivity levels',
    icon: 'settings',
    path: '/admin/fields',
    color: 'success'
  }
]

function navigateToSection(section: typeof adminSections[0]) {
  navigateTo(`/${tenantSlug.value}${section.path}`)
}
</script>

<template>
  <div>
    <NeuCard variant="flat" padding="none" class="p-4 sm:p-6">
      <!-- Header -->
      <div class="mb-4 sm:mb-6">
        <h1 class="text-base sm:text-lg font-semibold text-[var(--neu-text)]">Admin Settings</h1>
        <p class="text-[var(--neu-text-muted)] text-xs sm:text-sm mt-0.5">Manage system configuration and permissions</p>
      </div>

      <!-- Quick Links Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <NeuCard
          v-for="section in adminSections"
          :key="section.id"
          variant="flat"
          padding="none"
          class="cursor-pointer hover:shadow-lg transition-shadow p-3 sm:p-4 active:scale-[0.98]"
          @click="navigateToSection(section)"
        >
          <div class="flex items-start gap-3 sm:gap-4">
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="{
                'bg-[var(--neu-primary)]/10 text-[var(--neu-primary)]': section.color === 'primary',
                'bg-amber-500/10 text-amber-500': section.color === 'warning',
                'bg-green-500/10 text-green-500': section.color === 'success'
              }"
            >
              <svg v-if="section.icon === 'shield'" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <svg v-else-if="section.icon === 'settings'" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-sm sm:text-base text-[var(--neu-text)]">{{ section.title }}</h3>
              <p class="text-xs sm:text-sm text-[var(--neu-text-muted)] mt-0.5 sm:mt-1 line-clamp-2">{{ section.description }}</p>
            </div>
            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[var(--neu-text-muted)] flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </NeuCard>
      </div>
    </NeuCard>
  </div>
</template>
