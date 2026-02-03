<script setup lang="ts">
const {
  userData,
  isOwner,
  sectionStatus,
  isLoading,
  completeOnboarding
} = useOnboarding()

const confettiColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

// Generate confetti on mount
const confetti = ref<Array<{ id: number; x: number; color: string; delay: number; duration: number }>>([])

onMounted(() => {
  confetti.value = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2
  }))
})

async function handleComplete() {
  const sessionData = localStorage.getItem('session')
  if (sessionData) {
    const session = JSON.parse(sessionData)
    await completeOnboarding(session.tenantSlug)
  }
}
</script>

<template>
  <NeuCardForm
    title="You're all set!"
    subtitle="Your profile is complete"
  >
    <div class="space-y-6">
      <!-- Celebration -->
      <div class="relative text-center py-8 overflow-hidden">
        <!-- Confetti -->
        <div class="absolute inset-0 pointer-events-none">
          <div
            v-for="piece in confetti"
            :key="piece.id"
            class="confetti absolute w-2 h-2 rounded-full"
            :style="{
              left: `${piece.x}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`
            }"
          />
        </div>

        <!-- Success Icon -->
        <div class="relative w-24 h-24 mx-auto mb-6">
          <div class="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div class="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <svg class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-[var(--neu-text)] mb-2">
          Welcome aboard, {{ userData.preferredName || userData.firstName }}!
        </h2>
        <p class="text-[var(--neu-text-muted)]">
          <template v-if="isOwner">
            Your workspace is ready. Time to build your team!
          </template>
          <template v-else>
            You're all set to start working.
          </template>
        </p>
      </div>

      <!-- Summary -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Profile Summary</h3>

        <div class="grid gap-3">
          <!-- Personal Info -->
          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
            <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Personal Information</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ userData.firstName }} {{ userData.lastName }}</p>
            </div>
          </div>

          <!-- Emergency Contact -->
          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
            <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Emergency Contact</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ userData.emergencyContactName }} ({{ userData.emergencyContactRelationship }})</p>
            </div>
          </div>

          <!-- Employment -->
          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
            <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Employment</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ userData.title }}<span v-if="userData.department"> - {{ userData.department }}</span></p>
            </div>
          </div>

          <!-- Banking -->
          <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="sectionStatus.banking ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'"
            >
              <svg v-if="sectionStatus.banking" class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Banking Information</p>
              <p class="text-sm text-[var(--neu-text-muted)]">
                {{ sectionStatus.banking ? `${userData.bankName} - ••••${userData.bankAccountNumber?.slice(-4)}` : 'Not provided - can add later' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- What's Next (for owners) -->
      <div v-if="isOwner" class="space-y-3 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">What's next?</h3>
        <div class="grid gap-2">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <span class="text-lg">👥</span>
            <p class="text-sm text-blue-700 dark:text-blue-300">Invite your team members</p>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <span class="text-lg">🏢</span>
            <p class="text-sm text-purple-700 dark:text-purple-300">Set up departments and locations</p>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
            <span class="text-lg">📅</span>
            <p class="text-sm text-green-700 dark:text-green-300">Create your first schedule</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NeuButton
          variant="primary"
          size="lg"
          :loading="isLoading"
          @click="handleComplete"
        >
          {{ isOwner ? 'Go to Dashboard' : 'Start Working' }}
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
@keyframes confetti-fall {
  0% {
    transform: translateY(-100%) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(400px) rotate(720deg);
    opacity: 0;
  }
}

.confetti {
  animation: confetti-fall 2s ease-out forwards;
}
</style>
