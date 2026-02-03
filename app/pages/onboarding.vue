<script setup lang="ts">
definePageMeta({
  layout: false
})

const { currentStep, totalSteps, isOwner, isLoading, loadUserData, userData } = useOnboarding()

// Track initial loading state separately
const isInitialLoading = ref(true)

// Load session info and prefill user data on mount
onMounted(async () => {
  const sessionData = localStorage.getItem('session')
  if (!sessionData) {
    // No session, redirect to find domain
    await navigateTo('/find-domain')
    return
  }

  const session = JSON.parse(sessionData)
  if (!session.userId || !session.tenantSlug) {
    await navigateTo('/find-domain')
    return
  }

  // Load user data from registration to prefill
  await loadUserData(session.tenantSlug, session.userId)
  isInitialLoading.value = false
})
</script>

<template>
  <div class="min-h-screen neu-bg">
    <!-- Header -->
    <header class="p-4 sm:p-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--neu-primary)] to-[var(--neu-primary-dark)] flex items-center justify-center">
          <span class="text-white font-bold text-sm">O</span>
        </div>
        <span class="text-lg font-semibold text-[var(--neu-text)]">Optivo</span>
      </div>

      <!-- Progress -->
      <div class="hidden sm:flex items-center gap-2">
        <span class="text-sm text-[var(--neu-text-muted)]">Step {{ currentStep }} of {{ totalSteps }}</span>
        <div class="w-32 h-2 rounded-full bg-[var(--neu-bg-secondary)] overflow-hidden">
          <div
            class="h-full bg-[var(--neu-primary)] transition-all duration-300"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-6 sm:px-6 sm:py-10">
      <div class="max-w-2xl mx-auto">
        <!-- Initial Loading State -->
        <div v-if="isInitialLoading" class="text-center py-12">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] animate-spin" />
          <p class="text-[var(--neu-text-muted)]">Loading your information...</p>
        </div>

        <template v-else>
          <!-- Mobile Progress -->
          <div class="sm:hidden mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-[var(--neu-text-muted)]">Step {{ currentStep }} of {{ totalSteps }}</span>
              <span class="text-sm font-medium text-[var(--neu-primary)]">{{ Math.round((currentStep / totalSteps) * 100) }}%</span>
            </div>
            <div class="w-full h-2 rounded-full bg-[var(--neu-bg-secondary)] overflow-hidden">
              <div
                class="h-full bg-[var(--neu-primary)] transition-all duration-300"
                :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
              />
            </div>
          </div>

          <!-- Step Components -->
          <!-- Owner flow: Welcome(1) -> Personal(2) -> Emergency(3) -> Banking(4) -> Complete(5) -->
          <!-- Employee flow: Welcome(1) -> Personal(2) -> Emergency(3) -> Employment(4) -> Banking(5) -> Complete(6) -->
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 translate-x-8"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-8"
          >
            <OnboardingWelcome v-if="currentStep === 1" />
            <OnboardingPersonalInfo v-else-if="currentStep === 2" />
            <OnboardingEmergencyContact v-else-if="currentStep === 3" />
            <!-- Owner skips employment -->
            <template v-else-if="isOwner">
              <OnboardingBanking v-if="currentStep === 4" />
              <OnboardingComplete v-else-if="currentStep === 5" />
            </template>
            <!-- Employee has employment step -->
            <template v-else>
              <OnboardingEmployment v-if="currentStep === 4" />
              <OnboardingBanking v-else-if="currentStep === 5" />
              <OnboardingComplete v-else-if="currentStep === 6" />
            </template>
          </Transition>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.neu-bg {
  background: var(--neu-bg);
}
</style>
