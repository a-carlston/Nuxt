<script setup lang="ts">
const { email, companyName, registrationResult } = useRegistration()

const isProcessing = ref(true)
const currentStep = ref(0)
const showCelebration = ref(false)

const processingSteps = [
  { label: 'Creating your account', icon: '👤' },
  { label: 'Setting up your company', icon: '🏢' },
  { label: 'Configuring your plan', icon: '💎' },
  { label: 'Initializing workspace', icon: '⚙️' },
  { label: 'Almost there...', icon: '🚀' }
]

// Confetti particles
const confettiParticles = ref<Array<{ id: number; x: number; color: string; delay: number; duration: number }>>([])

function generateConfetti() {
  const colors = ['#4a90d9', '#50c878', '#ff6b6b', '#ffd93d', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894']
  confettiParticles.value = Array.from({ length: 150 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2
  }))
}

onMounted(() => {
  // Animate through processing steps
  const stepInterval = setInterval(() => {
    if (currentStep.value < processingSteps.length - 1) {
      currentStep.value++
    } else {
      clearInterval(stepInterval)
      // Short delay then show success
      setTimeout(() => {
        isProcessing.value = false
        showCelebration.value = true
        generateConfetti()
        // Stop confetti after animation
        setTimeout(() => {
          showCelebration.value = false
        }, 4000)
      }, 800)
    }
  }, 1000)
})
</script>

<template>
  <!-- Processing State -->
  <div v-if="isProcessing" class="flex flex-col items-center justify-center min-h-[500px] p-8">
    <div class="relative mb-8">
      <!-- Animated spinner ring -->
      <div class="w-24 h-24 rounded-full border-4 border-[var(--neu-bg-secondary)] relative">
        <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--neu-primary)] animate-spin" />
      </div>
      <!-- Center icon -->
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="text-3xl animate-pulse">{{ processingSteps[currentStep]?.icon }}</span>
      </div>
    </div>

    <!-- Current step label -->
    <p class="text-lg font-semibold text-[var(--neu-text)] mb-8 h-7">
      {{ processingSteps[currentStep]?.label }}
    </p>

    <!-- Progress steps -->
    <div class="w-full max-w-sm space-y-3">
      <div
        v-for="(step, index) in processingSteps"
        :key="index"
        :class="[
          'flex items-center gap-3 p-3 rounded-xl transition-all duration-500',
          index < currentStep ? 'bg-[var(--neu-success)]/10' :
          index === currentStep ? 'bg-[var(--neu-primary)]/10 scale-105' :
          'bg-[var(--neu-bg-secondary)]/50 opacity-50'
        ]"
      >
        <!-- Status icon -->
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
            index < currentStep ? 'bg-[var(--neu-success)] text-white' :
            index === currentStep ? 'bg-[var(--neu-primary)] text-white' :
            'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)]'
          ]"
        >
          <svg v-if="index < currentStep" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else-if="index === currentStep" class="text-sm">{{ step.icon }}</span>
          <span v-else class="text-xs">{{ index + 1 }}</span>
        </div>

        <!-- Label -->
        <span
          :class="[
            'text-sm font-medium transition-all duration-300',
            index < currentStep ? 'text-[var(--neu-success)]' :
            index === currentStep ? 'text-[var(--neu-text)]' :
            'text-[var(--neu-text-muted)]'
          ]"
        >
          {{ step.label }}
        </span>

        <!-- Loading indicator for current step -->
        <div v-if="index === currentStep" class="ml-auto">
          <div class="flex gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--neu-primary)] animate-bounce" style="animation-delay: 0ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--neu-primary)] animate-bounce" style="animation-delay: 150ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--neu-primary)] animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Success State -->
  <NeuCardForm v-else class="relative overflow-hidden">
    <!-- Confetti -->
    <div v-if="showCelebration" class="confetti-container absolute inset-0 pointer-events-none overflow-hidden z-50">
      <div
        v-for="particle in confettiParticles"
        :key="particle.id"
        class="confetti-particle absolute w-3 h-3"
        :style="{
          left: `${particle.x}%`,
          backgroundColor: particle.color,
          animationDelay: `${particle.delay}s`,
          animationDuration: `${particle.duration}s`
        }"
      />
    </div>

    <template #header>
      <div class="text-center py-4 relative">
        <!-- Animated success icon -->
        <div class="relative inline-block mb-4">
          <div class="w-24 h-24 rounded-full bg-[var(--neu-success)]/20 flex items-center justify-center mx-auto animate-success-pop">
            <div class="w-20 h-20 rounded-full bg-[var(--neu-success)]/30 flex items-center justify-center">
              <div class="w-16 h-16 rounded-full bg-[var(--neu-success)] flex items-center justify-center text-white">
                <svg class="w-10 h-10 animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <!-- Sparkles around the icon -->
          <span class="absolute -top-2 -right-2 text-2xl animate-sparkle">✨</span>
          <span class="absolute -bottom-1 -left-3 text-xl animate-sparkle" style="animation-delay: 0.2s">✨</span>
          <span class="absolute top-0 -left-4 text-lg animate-sparkle" style="animation-delay: 0.4s">⭐</span>
          <span class="absolute -top-3 left-1/2 text-lg animate-sparkle" style="animation-delay: 0.3s">🎉</span>
        </div>

        <h2 class="text-2xl font-bold text-[var(--neu-text)] animate-fade-in-up">Welcome to Optivo!</h2>
        <p class="text-[var(--neu-text-muted)] mt-2 animate-fade-in-up" style="animation-delay: 0.1s">
          {{ companyName || 'Your company' }} is ready to go
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Trial info card -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-[var(--neu-primary)]/10 to-[var(--neu-success)]/10 border border-[var(--neu-primary)]/20 animate-fade-in-up" style="animation-delay: 0.2s">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[var(--neu-primary)] flex items-center justify-center text-white">
            <span class="text-xl">🎁</span>
          </div>
          <div>
            <p class="font-semibold text-[var(--neu-text)]">14-day free trial activated!</p>
            <p class="text-sm text-[var(--neu-text-muted)]">Full access to all features, no credit card charged</p>
          </div>
        </div>
      </div>

      <!-- Email verification -->
      <div class="p-4 rounded-xl bg-[var(--neu-warning)]/10 border border-[var(--neu-warning)]/20 animate-fade-in-up" style="animation-delay: 0.3s">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📧</span>
          <div>
            <p class="font-medium text-[var(--neu-text)]">Verify your email</p>
            <p class="text-sm text-[var(--neu-text-muted)]">We sent a link to {{ email || 'your email' }}</p>
          </div>
        </div>
      </div>

      <!-- Quick start steps -->
      <div class="animate-fade-in-up" style="animation-delay: 0.4s">
        <h3 class="font-semibold text-[var(--neu-text)] mb-4">Quick start guide:</h3>
        <div class="space-y-3">
          <div class="flex gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]/50 hover:bg-[var(--neu-bg-secondary)] transition-colors cursor-pointer group">
            <div class="w-10 h-10 rounded-full bg-[var(--neu-primary)] flex items-center justify-center text-white text-sm font-bold group-hover:scale-110 transition-transform">1</div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Add your team</p>
              <p class="text-sm text-[var(--neu-text-muted)]">Invite employees via email or bulk CSV import</p>
            </div>
            <svg class="w-5 h-5 text-[var(--neu-text-muted)] self-center opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="flex gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]/50 hover:bg-[var(--neu-bg-secondary)] transition-colors cursor-pointer group">
            <div class="w-10 h-10 rounded-full bg-[var(--neu-bg-secondary)] flex items-center justify-center text-[var(--neu-text-muted)] text-sm font-bold group-hover:bg-[var(--neu-primary)] group-hover:text-white transition-all">2</div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Set up locations & roles</p>
              <p class="text-sm text-[var(--neu-text-muted)]">Configure departments and job positions</p>
            </div>
            <svg class="w-5 h-5 text-[var(--neu-text-muted)] self-center opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="flex gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]/50 hover:bg-[var(--neu-bg-secondary)] transition-colors cursor-pointer group">
            <div class="w-10 h-10 rounded-full bg-[var(--neu-bg-secondary)] flex items-center justify-center text-[var(--neu-text-muted)] text-sm font-bold group-hover:bg-[var(--neu-primary)] group-hover:text-white transition-all">3</div>
            <div class="flex-1">
              <p class="font-medium text-[var(--neu-text)]">Create your first schedule</p>
              <p class="text-sm text-[var(--neu-text-muted)]">Use AI-powered scheduling or start from scratch</p>
            </div>
            <svg class="w-5 h-5 text-[var(--neu-text-muted)] self-center opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center animate-fade-in-up" style="animation-delay: 0.5s">
        <NeuButton variant="primary" size="lg" class="group">
          <span>Go to Dashboard</span>
          <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
/* Confetti animation */
.confetti-particle {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation: confetti-fall linear forwards;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

/* Success pop animation */
@keyframes success-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-success-pop {
  animation: success-pop 0.5s ease-out forwards;
}

/* Checkmark draw animation */
@keyframes checkmark {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.animate-checkmark {
  stroke-dasharray: 100;
  animation: checkmark 0.6s ease-out 0.3s forwards;
  stroke-dashoffset: 100;
}

/* Sparkle animation */
@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(180deg);
  }
}

.animate-sparkle {
  animation: sparkle 1.5s ease-in-out infinite;
}

/* Fade in up animation */
@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
  opacity: 0;
}

/* Bounce animation for loading dots */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-bounce {
  animation: bounce 0.6s ease-in-out infinite;
}
</style>
