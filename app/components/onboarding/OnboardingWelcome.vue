<script setup lang="ts">
const { userData, isOwner, nextStep } = useOnboarding()

// Steps shown depend on user type (owner skips employment)
const steps = computed(() => {
  const baseSteps = [
    { icon: '👤', title: 'Personal Information', description: 'Review and complete your personal details' },
    { icon: '🆘', title: 'Emergency Contact', description: 'Add someone we can contact in case of emergency' }
  ]

  // Only add employment for non-owners
  if (!isOwner.value) {
    baseSteps.push({ icon: '💼', title: 'Employment Details', description: 'Set up your role and work information' })
  }

  baseSteps.push({ icon: '🏦', title: 'Banking Information', description: 'Optional: Add direct deposit details' })

  return baseSteps
})
</script>

<template>
  <NeuCardForm
    :title="`Welcome, ${userData.firstName || 'there'}!`"
    subtitle="Let's finish setting up your profile"
  >
    <div class="space-y-6">
      <!-- Welcome Message -->
      <div class="text-center py-4">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--neu-primary)] to-[var(--neu-primary-dark)] flex items-center justify-center">
          <span class="text-3xl">🎉</span>
        </div>
        <p class="text-[var(--neu-text-muted)] max-w-md mx-auto">
          <template v-if="isOwner">
            Your workspace is ready! Before you dive in, let's complete your employee profile.
            This information helps us set up payroll, emergency contacts, and more.
          </template>
          <template v-else>
            Welcome to the team! Let's set up your employee profile.
            This should only take a few minutes.
          </template>
        </p>
      </div>

      <!-- What we'll cover -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-[var(--neu-text)] mb-3">What we'll cover:</h3>
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="flex items-start gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]"
        >
          <div class="w-10 h-10 rounded-lg neu-flat flex items-center justify-center flex-shrink-0">
            <span class="text-lg">{{ step.icon }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-[var(--neu-text)]">{{ step.title }}</p>
            <p class="text-sm text-[var(--neu-text-muted)]">{{ step.description }}</p>
          </div>
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--neu-bg)] flex items-center justify-center text-xs text-[var(--neu-text-muted)]">
            {{ index + 1 }}
          </div>
        </div>
      </div>

      <!-- Time estimate -->
      <div class="flex items-center justify-center gap-2 text-sm text-[var(--neu-text-muted)] py-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Takes about 5-10 minutes</span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NeuButton variant="primary" @click="nextStep">
          Get Started
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
.neu-flat {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}
</style>
