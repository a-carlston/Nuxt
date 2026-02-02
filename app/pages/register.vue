<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { stepInfo, testimonials } from '~/constants/registration'

const { currentStep, totalSteps } = useRegistration()

// Testimonials rotation
const currentTestimonial = ref(0)
const activeTestimonial = computed(() => testimonials[currentTestimonial.value]!)
let testimonialInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  testimonialInterval = setInterval(() => {
    currentTestimonial.value = (currentTestimonial.value + 1) % testimonials.length
  }, 6000)
})

onUnmounted(() => {
  if (testimonialInterval) clearInterval(testimonialInterval)
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left Panel -->
    <div class="hidden lg:flex lg:w-[420px] bg-[var(--neu-primary)] p-10 flex-col justify-between relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="absolute top-20 left-10 w-32 h-32 rounded-full bg-white" />
        <div class="absolute top-60 right-10 w-20 h-20 rounded-full bg-white" />
        <div class="absolute bottom-40 left-16 w-24 h-24 rounded-full bg-white" />
      </div>

      <div class="relative z-10">
        <NuxtLink to="/" class="flex items-center gap-3 mb-10">
          <div class="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl">
            SF
          </div>
          <span class="font-bold text-xl text-white">ShiftFlow</span>
        </NuxtLink>

        <!-- Dynamic Content Based on Step -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-white mb-3">
            <template v-if="currentStep === 1">Create your account</template>
            <template v-else-if="currentStep === 2">Your company details</template>
            <template v-else-if="currentStep === 3">Choose your plan</template>
            <template v-else-if="currentStep === 4">Complete your setup</template>
            <template v-else>Welcome aboard!</template>
          </h1>
          <p class="text-white/80">
            <template v-if="currentStep === 1">Set up your admin account for your company.</template>
            <template v-else-if="currentStep === 2">Company info, address, and branding.</template>
            <template v-else-if="currentStep === 3">All plans include a 14-day free trial.</template>
            <template v-else-if="currentStep === 4">You won't be charged until your trial ends.</template>
            <template v-else>Your account is ready to go.</template>
          </p>
        </div>

        <!-- Testimonial -->
        <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-8">
          <div class="min-h-[120px] relative">
            <Transition
              mode="out-in"
              enter-active-class="transition-all duration-400 ease-out"
              enter-from-class="opacity-0 translate-x-4"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-x-0"
              leave-to-class="opacity-0 -translate-x-4"
            >
              <div :key="currentTestimonial">
                <p class="text-white text-sm leading-relaxed mb-4">
                  "{{ activeTestimonial.quote }}"
                </p>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-xs">
                    {{ activeTestimonial.avatar }}
                  </div>
                  <div>
                    <p class="text-white font-medium text-sm">{{ activeTestimonial.author }}</p>
                    <p class="text-white/60 text-xs">{{ activeTestimonial.role }}, {{ activeTestimonial.company }}</p>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
          <div class="flex gap-1.5 mt-4">
            <button
              v-for="(_, i) in testimonials"
              :key="i"
              type="button"
              :class="['h-1 rounded-full transition-all', i === currentTestimonial ? 'w-6 bg-white' : 'w-1.5 bg-white/30']"
              @click="currentTestimonial = i"
            />
          </div>
        </div>

        <!-- Trust Badges -->
        <div class="space-y-3 text-sm">
          <div class="flex items-center gap-2 text-white/90">
            <span class="text-green-300">✓</span>
            <span>14-day free trial</span>
          </div>
          <div class="flex items-center gap-2 text-white/90">
            <span class="text-green-300">✓</span>
            <span>No credit card for trial</span>
          </div>
          <div class="flex items-center gap-2 text-white/90">
            <span class="text-green-300">✓</span>
            <span>Cancel anytime</span>
          </div>
          <div class="flex items-center gap-2 text-white/90">
            <span class="text-green-300">✓</span>
            <span>HIPAA compliant options</span>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-white/50 text-xs">
        © 2025 ShiftFlow Inc. All rights reserved.
      </div>
    </div>

    <!-- Right Panel -->
    <div class="flex-1 flex flex-col bg-[var(--neu-bg)] h-screen overflow-hidden">
      <!-- Mobile Header -->
      <div class="lg:hidden p-4 border-b border-[var(--neu-shadow-dark)]/10 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-[var(--neu-primary)] flex items-center justify-center text-white font-bold text-sm">
            SF
          </div>
          <span class="font-bold text-[var(--neu-text)]">ShiftFlow</span>
        </NuxtLink>
        <span class="text-xs text-[var(--neu-text-muted)]">Step {{ currentStep }} of {{ totalSteps }}</span>
      </div>

      <!-- Progress Steps -->
      <div v-if="currentStep <= totalSteps" class="px-4 lg:px-8 pt-6 lg:pt-8">
        <div class="max-w-2xl mx-auto">
          <div class="flex items-center">
            <template v-for="(step, i) in stepInfo" :key="i">
              <div class="flex flex-col items-center">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    i + 1 === currentStep
                      ? 'bg-[var(--neu-primary)] text-white ring-4 ring-[var(--neu-primary)]/20'
                      : i + 1 < currentStep
                        ? 'bg-[var(--neu-success)] text-white'
                        : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)]'
                  ]"
                >
                  <span v-if="i + 1 < currentStep">✓</span>
                  <span v-else>{{ step.icon }}</span>
                </div>
                <span
                  :class="[
                    'text-[10px] mt-1.5 hidden md:block',
                    i + 1 === currentStep ? 'text-[var(--neu-primary)] font-medium' : 'text-[var(--neu-text-muted)]'
                  ]"
                >
                  {{ step.title }}
                </span>
              </div>
              <div
                v-if="i < stepInfo.length - 1"
                :class="[
                  'flex-1 h-0.5 mx-1 md:mx-2 rounded transition-all',
                  i + 1 < currentStep ? 'bg-[var(--neu-success)]' : 'bg-[var(--neu-bg-secondary)]'
                ]"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <div class="flex-1 px-4 lg:px-8 py-6 overflow-hidden min-h-0">
        <div class="max-w-2xl mx-auto h-full [&>*]:h-full">
          <RegisterStepAccount v-if="currentStep === 1" />
          <RegisterStepCompany v-else-if="currentStep === 2" />
          <RegisterStepPlan v-else-if="currentStep === 3" />
          <RegisterStepBilling v-else-if="currentStep === 4" />
          <RegisterStepSuccess v-else-if="currentStep === 5" />
        </div>
      </div>
    </div>
  </div>
</template>
