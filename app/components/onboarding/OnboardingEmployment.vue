<script setup lang="ts">
const {
  userData,
  isOwner,
  isStep4Valid,
  isLoading,
  saveStepData,
  nextStep,
  prevStep
} = useOnboarding()

const employmentTypeOptions = [
  { label: 'Full-time', value: 'full-time' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Temporary', value: 'temporary' },
  { label: 'Intern', value: 'intern' }
]

async function handleContinue() {
  const sessionData = localStorage.getItem('session')
  if (sessionData) {
    const session = JSON.parse(sessionData)
    try {
      await saveStepData(session.tenantSlug)
    } catch (e) {
      // Continue anyway
    }
  }
  nextStep()
}

// For owner, set some defaults
onMounted(() => {
  if (isOwner.value) {
    if (!userData.value.title) userData.value.title = 'Administrator'
    if (!userData.value.startDate) userData.value.startDate = new Date().toISOString().split('T')[0]
    if (!userData.value.employmentType) userData.value.employmentType = 'full-time'
  }
})
</script>

<template>
  <NeuCardForm
    title="Employment Details"
    :subtitle="isOwner ? 'Set up your role as company administrator' : 'Your work information'"
  >
    <div class="space-y-6">
      <!-- Owner Notice -->
      <div v-if="isOwner" class="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
        <svg class="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-purple-700 dark:text-purple-300">You're the account owner</p>
          <p class="text-sm text-purple-600 dark:text-purple-400">
            You have full administrator access. You can update your role and add departments/divisions later in settings.
          </p>
        </div>
      </div>

      <!-- Basic Employment Info -->
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.employeeId"
            label="Employee ID"
            placeholder="Auto-generated if blank"
          />
          <NeuInput
            v-model="userData.title"
            label="Job title *"
            placeholder="e.g., Software Engineer"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.department"
            label="Department"
            placeholder="e.g., Engineering"
          />
          <NeuInput
            v-model="userData.division"
            label="Division"
            placeholder="e.g., Product"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.startDate"
            label="Start date *"
            type="date"
          />
          <NeuSelect
            v-model="userData.employmentType"
            label="Employment type"
            :options="employmentTypeOptions"
            placeholder="Select..."
          />
        </div>
      </div>

      <!-- Work Contact -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Work Contact</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.workEmail"
            label="Work email"
            type="email"
            :placeholder="userData.email || 'you@company.com'"
          />
          <div class="flex gap-2">
            <NeuInput
              v-model="userData.workPhone"
              label="Work phone"
              type="tel"
              placeholder="(555) 123-4567"
              class="flex-1"
            />
            <NeuInput
              v-model="userData.workPhoneExt"
              label="Ext."
              placeholder="123"
              class="w-20"
            />
          </div>
        </div>
      </div>

      <!-- Location -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Work Location</h3>
        <NeuInput
          v-model="userData.location"
          label="Office location"
          placeholder="e.g., Headquarters, Remote, NYC Office"
        />
        <p class="text-xs text-[var(--neu-text-muted)]">
          You can set up specific locations with addresses in company settings later.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <NeuButton variant="primary" :disabled="!isStep4Valid" :loading="isLoading" @click="handleContinue">
          Continue
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>
