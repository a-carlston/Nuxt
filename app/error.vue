<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const errorTitle = computed(() => {
  if (props.error.statusCode === 404) return 'Page not found'
  if (props.error.statusCode === 500) return 'Server error'
  if (props.error.statusCode === 403) return 'Access denied'
  return 'Something went wrong'
})

const errorDescription = computed(() => {
  if (props.error.statusCode === 404) return "The page you're looking for doesn't exist or has been moved."
  if (props.error.statusCode === 500) return "We're having trouble on our end. Please try again later."
  if (props.error.statusCode === 403) return "You don't have permission to access this page."
  return props.error.message || "An unexpected error occurred."
})

const errorIcon = computed(() => {
  if (props.error.statusCode === 404) return '🔍'
  if (props.error.statusCode === 500) return '⚠️'
  if (props.error.statusCode === 403) return '🔒'
  return '❌'
})

function goBack() {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    navigateTo('/')
  }
}

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen neu-bg flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <NeuCard padding="lg" class="text-center">
        <!-- Error Icon -->
        <div class="w-20 h-20 mx-auto mb-6 rounded-2xl neu-icon-container flex items-center justify-center">
          <span class="text-4xl">{{ errorIcon }}</span>
        </div>

        <!-- Error Code -->
        <p class="text-6xl font-bold text-[var(--neu-primary)] mb-2">
          {{ error.statusCode }}
        </p>

        <!-- Error Title -->
        <h1 class="text-xl font-semibold text-[var(--neu-text)] mb-3">
          {{ errorTitle }}
        </h1>

        <!-- Error Description -->
        <p class="text-[var(--neu-text-muted)] mb-8">
          {{ errorDescription }}
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NeuButton
            variant="default"
            @click="goBack"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </NeuButton>
          <NeuButton
            variant="primary"
            @click="goHome"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </NeuButton>
        </div>
      </NeuCard>

      <!-- Additional Help -->
      <p class="text-center text-sm text-[var(--neu-text-muted)] mt-6">
        Need help? <a href="mailto:support@optivo.app" class="text-[var(--neu-primary)] hover:underline">Contact support</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.neu-bg {
  background: var(--neu-bg);
}

.neu-icon-container {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}
</style>
