<script setup lang="ts">
import { pricingPlans, complianceOptions } from '~/constants/registration'

const {
  sameAsCompany,
  billingCountry,
  billingState,
  billingCity,
  billingAddress,
  billingAddress2,
  billingZip,
  cardName,
  cardNumber,
  cardExpiry,
  cardCvc,
  cardSignature,
  companyAddress,
  companyAddress2,
  companyCity,
  companyState,
  companyZip,
  companyCountry,
  countries,
  billingStates,
  billingCities,
  cardType,
  selectedPlan,
  billingCycle,
  selectedCompliance,
  basePrices,
  compliancePricing,
  currentPrice,
  estimatedMonthly,
  trialEndDate,
  formatCardNumber,
  formatExpiry,
  formatCvc,
  agreeTerms,
  canProceed,
  prevStep,
  submitRegistration,
  isSubmitting,
  submitError
} = useRegistration()

const isCardFlipped = ref(false)
const hasAttemptedSubmit = ref(false)
const hasSeenFlipPrompt = ref(false)

// Track which fields have been touched/blurred
const touchedFields = ref({
  cardNumber: false,
  cardName: false,
  cardExpiry: false,
  cardCvc: false,
  cardSignature: false
})

// Check if front of card is complete
const isFrontComplete = computed(() => {
  return cardNumber.value.replace(/\s/g, '').length >= 15 &&
         cardName.value.trim().length > 0 &&
         cardExpiry.value.length === 5
})

// Check if back of card is complete
const isBackComplete = computed(() => {
  return cardCvc.value.length >= 3 &&
         cardSignature.value.trim().length >= 2
})

// Current step for the card flow
const cardStep = computed(() => {
  if (!isFrontComplete.value) return 1
  if (!isBackComplete.value) return 2
  return 3 // All complete
})

// Validation state for visual feedback
const cardValidation = computed(() => ({
  cardNumber: !touchedFields.value.cardNumber || cardNumber.value.replace(/\s/g, '').length >= 15,
  cardName: !touchedFields.value.cardName || cardName.value.trim().length > 0,
  cardExpiry: !touchedFields.value.cardExpiry || cardExpiry.value.length === 5,
  cardCvc: !touchedFields.value.cardCvc || cardCvc.value.length >= 3,
  cardSignature: !touchedFields.value.cardSignature || cardSignature.value.trim().length >= 2
}))

// Auto-flip when front is complete
watch(isFrontComplete, (complete) => {
  if (complete && !isCardFlipped.value && !hasSeenFlipPrompt.value) {
    // Small delay for better UX
    setTimeout(() => {
      isCardFlipped.value = true
      hasSeenFlipPrompt.value = true
    }, 500)
  }
})

function markTouched(field: keyof typeof touchedFields.value) {
  touchedFields.value[field] = true
}

function focusCvc() {
  isCardFlipped.value = true
}

function blurCvc() {
  // Don't auto-flip back if signature still needs to be filled
  if (cardSignature.value.trim().length >= 2) {
    isCardFlipped.value = false
  }
  markTouched('cardCvc')
}

function flipCard() {
  isCardFlipped.value = !isCardFlipped.value
  hasSeenFlipPrompt.value = true
}
</script>

<template>
  <NeuCardForm title="Billing information" subtitle="You won't be charged until your trial ends">
    <div class="space-y-6">
      <!-- Interactive Credit Card -->
      <div>
        <div class="flex flex-col gap-3 mb-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-[var(--neu-text)]">Payment method</label>
            <span v-if="cardStep === 3" class="text-xs text-green-500 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Card complete
            </span>
          </div>

          <!-- Step Indicator -->
          <div class="flex items-center justify-center gap-2">
            <!-- Step 1: Front -->
            <button
              type="button"
              @click="isCardFlipped = false"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                !isCardFlipped
                  ? 'bg-[var(--neu-primary)] text-white shadow-md'
                  : isFrontComplete
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)]'
              ]"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                :class="isFrontComplete ? 'bg-green-500 text-white' : 'bg-white/20'">
                <svg v-if="isFrontComplete" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else>1</span>
              </span>
              Card Front
            </button>

            <!-- Arrow -->
            <svg class="w-4 h-4 text-[var(--neu-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Step 2: Back -->
            <button
              type="button"
              @click="isCardFlipped = true"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                isCardFlipped
                  ? 'bg-[var(--neu-primary)] text-white shadow-md'
                  : isBackComplete
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : isFrontComplete
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 animate-pulse'
                      : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)]'
              ]"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                :class="isBackComplete ? 'bg-green-500 text-white' : isFrontComplete ? 'bg-amber-500 text-white' : 'bg-gray-300 dark:bg-gray-600'">
                <svg v-if="isBackComplete" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else>2</span>
              </span>
              Card Back
              <span v-if="isFrontComplete && !isBackComplete && !isCardFlipped" class="text-[10px]">(CVC + Sign)</span>
            </button>
          </div>

          <!-- Instruction text -->
          <p class="text-xs text-center text-[var(--neu-text-muted)]">
            <template v-if="!isFrontComplete">
              Enter your card number, name, and expiration date on the front
            </template>
            <template v-else-if="!isBackComplete">
              <span class="text-amber-600 dark:text-amber-400 font-medium">Now flip to back</span> to enter CVC and sign
            </template>
            <template v-else>
              Card details complete
            </template>
          </p>
        </div>

        <!-- Card Container with Flip -->
        <div class="card-container mx-auto w-full max-w-sm mb-4" style="perspective: 1000px;">
          <div
            :class="['card-flipper relative w-full transition-transform duration-500', { 'is-flipped': isCardFlipped }]"
            style="transform-style: preserve-3d;"
          >
            <!-- Front of Card -->
            <div
              :class="[
                'card-front relative aspect-[1.586/1] w-full rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden',
                cardType === 'visa' ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                cardType === 'mastercard' ? 'bg-gradient-to-br from-red-500 to-orange-600' :
                cardType === 'amex' ? 'bg-gradient-to-br from-slate-600 to-slate-800' :
                cardType === 'discover' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                'bg-gradient-to-br from-gray-600 to-gray-800'
              ]"
              style="backface-visibility: hidden;"
            >
              <!-- Card Background Pattern -->
              <div class="absolute inset-0 opacity-10 pointer-events-none">
                <div class="absolute top-4 right-4 w-20 sm:w-32 h-20 sm:h-32 rounded-full bg-white" />
                <div class="absolute -bottom-8 -left-8 w-28 sm:w-40 h-28 sm:h-40 rounded-full bg-white" />
              </div>

              <!-- Card Content -->
              <div class="relative h-full flex flex-col justify-between text-white">
                <!-- Top Row: Chip & Logo -->
                <div class="flex justify-between items-start">
                  <div class="w-9 sm:w-12 h-7 sm:h-9 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-inner" />
                  <div class="text-right">
                    <span v-if="cardType === 'visa'" class="text-xl sm:text-2xl font-bold italic">VISA</span>
                    <span v-else-if="cardType === 'mastercard'" class="text-lg sm:text-xl font-bold flex items-center">
                      <span class="inline-block w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-red-500 -mr-2" />
                      <span class="inline-block w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-yellow-500 opacity-80" />
                    </span>
                    <span v-else-if="cardType === 'amex'" class="text-lg sm:text-xl font-bold">AMEX</span>
                    <span v-else-if="cardType === 'discover'" class="text-lg sm:text-xl font-bold">DISCOVER</span>
                    <span v-else class="text-xs sm:text-sm opacity-60">CARD</span>
                  </div>
                </div>

                <!-- Card Number Input -->
                <div class="my-1 sm:my-2">
                  <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Card Number</p>
                  <input
                    :value="cardNumber"
                    @input="formatCardNumber"
                    @blur="markTouched('cardNumber')"
                    type="text"
                    inputmode="numeric"
                    placeholder="•••• •••• •••• ••••"
                    :class="[
                      'card-input w-full bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white font-mono text-sm sm:text-lg tracking-wider placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all',
                      !cardNumber && !touchedFields.cardNumber && 'animate-pulse-subtle',
                      !cardValidation.cardNumber && 'ring-2 ring-red-500 border-red-500'
                    ]"
                  />
                </div>

                <!-- Bottom Row: Name & Expiry -->
                <div class="flex justify-between items-end gap-2 sm:gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Card Holder</p>
                    <input
                      v-model="cardName"
                      @blur="markTouched('cardName')"
                      type="text"
                      placeholder="YOUR NAME"
                      :class="[
                        'card-input w-full bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-white font-medium text-xs sm:text-sm uppercase tracking-wide placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all',
                        !cardValidation.cardName && 'ring-2 ring-red-500 border-red-500'
                      ]"
                    />
                  </div>
                  <div class="flex-shrink-0">
                    <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Expires</p>
                    <input
                      :value="cardExpiry"
                      @input="formatExpiry"
                      @blur="markTouched('cardExpiry')"
                      type="text"
                      inputmode="numeric"
                      placeholder="MM/YY"
                      :class="[
                        'card-input w-16 sm:w-20 bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-white font-mono text-xs sm:text-sm text-center placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all',
                        !cardValidation.cardExpiry && 'ring-2 ring-red-500 border-red-500'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Back of Card -->
            <div
              :class="[
                'card-back absolute inset-0 aspect-[1.586/1] w-full rounded-xl sm:rounded-2xl overflow-hidden',
                cardType === 'visa' ? 'bg-gradient-to-br from-blue-700 to-blue-900' :
                cardType === 'mastercard' ? 'bg-gradient-to-br from-red-600 to-orange-700' :
                cardType === 'amex' ? 'bg-gradient-to-br from-slate-700 to-slate-900' :
                cardType === 'discover' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                'bg-gradient-to-br from-gray-700 to-gray-900'
              ]"
              style="backface-visibility: hidden; transform: rotateY(180deg);"
            >
              <!-- Magnetic Strip -->
              <div class="w-full h-6 sm:h-10 bg-gray-900 mt-3 sm:mt-5" />

              <!-- CVV & Signature Section -->
              <div class="px-3 sm:px-5 mt-3 sm:mt-4">
                <div class="flex items-start gap-3 sm:gap-4">
                  <!-- Signature Area -->
                  <div class="flex-1">
                    <p class="text-[9px] sm:text-xs text-white/70 mb-1.5 leading-tight font-medium">
                      Sign below to authorize billing
                    </p>
                    <div class="relative">
                      <input
                        v-model="cardSignature"
                        @blur="markTouched('cardSignature')"
                        type="text"
                        :placeholder="cardName || 'Type your name to sign'"
                        :class="[
                          'w-full h-9 sm:h-11 bg-white/95 rounded-lg px-3 text-gray-800 text-sm sm:text-base italic placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400',
                          !cardValidation.cardSignature && 'ring-2 ring-red-500'
                        ]"
                        style="font-family: 'Brush Script MT', cursive, serif;"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-[11px] text-gray-400">
                        {{ trialEndDate }}
                      </span>
                    </div>
                  </div>
                  <!-- CVC -->
                  <div class="text-center flex-shrink-0">
                    <p class="text-[9px] sm:text-xs text-white/70 uppercase mb-1.5 font-medium">CVC</p>
                    <input
                      :value="cardCvc"
                      @input="formatCvc"
                      @focus="focusCvc"
                      @blur="blurCvc"
                      type="text"
                      inputmode="numeric"
                      placeholder="•••"
                      :class="[
                        'w-14 sm:w-16 h-9 sm:h-11 bg-white rounded-lg text-gray-800 font-mono text-center text-lg sm:text-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400',
                        !cardValidation.cardCvc && 'ring-2 ring-red-500'
                      ]"
                    />
                  </div>
                </div>
              </div>

              <!-- Agreement Text -->
              <div class="px-3 sm:px-5 mt-2 sm:mt-3">
                <p class="text-[8px] sm:text-[10px] text-white/50 leading-tight">
                  By signing, you agree to be charged based on active headcount starting {{ trialEndDate }}.
                  Auto-renews until cancelled.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick flip button for mobile -->
        <div class="flex justify-center mt-4 pt-2">
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all neu-btn-flip"
            :class="[
              isFrontComplete && !isBackComplete && !isCardFlipped
                ? 'bg-amber-500 text-white shadow-lg animate-bounce-subtle'
                : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]'
            ]"
            @click="flipCard"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ isCardFlipped ? 'View front of card' : 'Flip to back of card' }}
          </button>
        </div>
      </div>

      <!-- Billing Address -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium text-[var(--neu-text)]">Billing address</label>
          <NeuCheckbox v-model="sameAsCompany" label="Same as company" size="sm" />
        </div>
        <div v-if="!sameAsCompany" class="space-y-4">
          <NeuSearch v-model="billingCountry" :options="countries" label="Country" placeholder="Search country..." />
          <NeuInput v-model="billingAddress" label="Street address" placeholder="123 Main Street" />
          <NeuInput v-model="billingAddress2" label="Apt, suite, etc. (optional)" placeholder="Suite 100" />
          <div class="grid grid-cols-3 gap-4">
            <NeuSearch
              v-if="billingCities.length > 0"
              v-model="billingCity"
              :options="billingCities"
              label="City"
              placeholder="Search..."
            />
            <NeuInput v-else v-model="billingCity" label="City" placeholder="City" />
            <NeuSearch
              v-if="billingStates.length > 0"
              v-model="billingState"
              :options="billingStates"
              label="State"
              placeholder="Search..."
            />
            <NeuInput v-else v-model="billingState" label="State" placeholder="State" />
            <NeuInput v-model="billingZip" label="ZIP code" placeholder="12345" />
          </div>
        </div>
        <NeuCard v-else variant="pressed" padding="sm">
          <p class="text-sm text-[var(--neu-text-muted)]">
            {{ companyAddress }}<span v-if="companyAddress2">, {{ companyAddress2 }}</span><br>
            {{ companyCity }}<span v-if="companyState">, {{ companyState }}</span> {{ companyZip }}<br>
            {{ countries.find(c => c.value === companyCountry)?.label?.slice(2) }}
          </p>
        </NeuCard>
      </div>

      <!-- Order Summary -->
      <div class="neu-summary-card p-4 rounded-xl">
        <h4 class="font-semibold text-[var(--neu-text)] mb-3">Order summary</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-[var(--neu-text)]">{{ pricingPlans.find(p => p.id === selectedPlan)?.name }} plan</span>
            <span class="text-[var(--neu-text)] font-medium">${{ basePrices[selectedPlan as keyof typeof basePrices][billingCycle] }}/user/mo</span>
          </div>
          <div v-for="compId in selectedCompliance" :key="compId" class="flex justify-between">
            <span class="text-[var(--neu-text)]">{{ complianceOptions.find(c => c.id === compId)?.name }}</span>
            <span class="text-[var(--neu-text)] font-medium">+${{ compliancePricing[compId as keyof typeof compliancePricing][billingCycle] }}/user/mo</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--neu-text)]">Billing cycle</span>
            <span class="text-[var(--neu-text)] font-medium">{{ billingCycle === 'annual' ? 'Annual' : 'Monthly' }}</span>
          </div>
          <div class="flex justify-between pt-2 mt-2 border-t border-[var(--neu-shadow-dark)]/20">
            <span class="text-[var(--neu-text)] font-semibold">Total per user</span>
            <span class="text-[var(--neu-primary)] font-bold">${{ currentPrice }}/mo</span>
          </div>
          <div class="flex justify-between pt-2 mt-2 border-t border-[var(--neu-shadow-dark)]/20">
            <span class="text-[var(--neu-text)] font-semibold">Due today</span>
            <span class="text-[var(--neu-success)] font-bold text-lg">$0.00</span>
          </div>
          <p class="text-xs text-[var(--neu-text)] mt-3 p-2 rounded-lg bg-[var(--neu-bg-secondary)]">
            Your 14-day free trial starts today. You'll be charged based on active headcount starting {{ new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() }}.
          </p>
        </div>
      </div>

      <!-- Terms -->
      <NeuCheckbox v-model="agreeTerms">
        <template #label>
          <span class="text-sm text-[var(--neu-text-muted)]">
            I agree to the <a href="#" class="text-[var(--neu-primary)]">Terms of Service</a> and <a href="#" class="text-[var(--neu-primary)]">Privacy Policy</a>
          </span>
        </template>
      </NeuCheckbox>

      </div>
    <template #footer>
      <div class="space-y-3">
        <div v-if="submitError" class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {{ submitError }}
        </div>
        <div class="flex justify-between">
          <NeuButton variant="ghost" :disabled="isSubmitting" @click="prevStep">Back</NeuButton>
          <NeuButton variant="primary" :disabled="!canProceed || isSubmitting" :loading="isSubmitting" @click="submitRegistration">
            {{ isSubmitting ? 'Creating account...' : 'Start Free Trial' }}
          </NeuButton>
        </div>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
.card-flipper {
  transform-style: preserve-3d;
}

.card-flipper.is-flipped {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}

.neu-summary-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  border: 2px solid var(--neu-primary);
}

.card-input {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

@keyframes pulse-subtle {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.animate-bounce-subtle {
  animation: bounce-subtle 1s ease-in-out infinite;
}

.neu-btn-flip {
  box-shadow: var(--neu-shadow-flat);
  transition: all 0.2s ease;
}

.neu-btn-flip:hover {
  box-shadow: var(--neu-shadow-raised);
}
</style>
