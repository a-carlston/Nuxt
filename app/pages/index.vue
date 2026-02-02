<script setup lang="ts">
import { ref } from 'vue'
import { useTheme, type ColorPalette } from '~/composables/useTheme'

const { effectiveTheme, setThemeMode } = useTheme()

const activeNav = ref('features')
const contactModalOpen = ref(false)

const navItems = [
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' }
]

const avatarMenuItems = [
  { id: 'login', label: 'Sign In' },
  { id: 'signup', label: 'Create Account' }
]

function handleNavSelect(id: string) {
  activeNav.value = id
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

function handleAvatarMenu(id: string) {
  if (id === 'login' || id === 'signup') {
    navigateTo('/register')
  }
}

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '500+', label: 'Companies' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Rating' }
]

const features = [
  {
    icon: '📅',
    title: 'Smart Scheduling',
    description: 'AI-powered shift scheduling that considers availability, skills, and labor laws automatically.'
  },
  {
    icon: '⏱️',
    title: 'Time Tracking',
    description: 'Accurate clock-in/out with GPS verification, break tracking, and overtime calculations.'
  },
  {
    icon: '📊',
    title: 'Real-time Analytics',
    description: 'Live dashboards showing labor costs, attendance patterns, and productivity metrics.'
  },
  {
    icon: '🔄',
    title: 'Shift Swapping',
    description: 'Let employees swap shifts with manager approval workflows built right in.'
  },
  {
    icon: '📱',
    title: 'Mobile First',
    description: 'Full-featured mobile app for employees to manage schedules, request time off, and more.'
  },
  {
    icon: '🔔',
    title: 'Smart Notifications',
    description: 'Automated reminders for shifts, approvals, and schedule changes via push, SMS, or email.'
  }
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '4',
    description: 'Perfect for small teams getting started',
    features: ['Up to 25 employees', 'Basic scheduling', 'Time tracking', 'Mobile app access', 'Email support'],
    popular: false
  },
  {
    name: 'Professional',
    price: '8',
    description: 'For growing businesses with complex needs',
    features: ['Up to 100 employees', 'Advanced scheduling', 'Shift swapping', 'PTO management', 'Analytics dashboard', 'Priority support'],
    popular: true
  },
  {
    name: 'Enterprise',
    price: '15',
    description: 'For large organizations requiring customization',
    features: ['Unlimited employees', 'Custom workflows', 'API access', 'SSO integration', 'Dedicated account manager', '24/7 phone support'],
    popular: false
  }
]

const testimonials = [
  {
    quote: "Optivo cut our scheduling time by 80%. What used to take hours now takes minutes.",
    author: "Sarah Chen",
    role: "Operations Manager",
    company: "RetailCo"
  },
  {
    quote: "The mobile app is a game-changer. Our team actually enjoys using it.",
    author: "Marcus Johnson",
    role: "HR Director",
    company: "HealthFirst"
  },
  {
    quote: "Finally, a workforce tool that doesn't require a PhD to operate.",
    author: "Emily Rodriguez",
    role: "Store Manager",
    company: "CafeChain"
  }
]
</script>

<template>
  <div class="min-h-screen">
    <!-- Navbar -->
    <NeuNavbar
      :items="navItems"
      :active-item="activeNav"
      @select="handleNavSelect"
    >
      <template #logo>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[var(--neu-primary)] flex items-center justify-center text-white font-bold text-xl">
            OP
          </div>
          <span class="font-bold text-xl text-[var(--neu-text)]">Optivo</span>
        </div>
      </template>
      <template #actions>
        <NuxtLink to="/register">
          <NeuButton
            variant="ghost"
            size="sm"
          >
            Sign In
          </NeuButton>
        </NuxtLink>
        <NuxtLink to="/register">
          <NeuButton
            variant="primary"
            size="sm"
          >
            Start Free Trial
          </NeuButton>
        </NuxtLink>
      </template>
    </NeuNavbar>

    <!-- Hero Section -->
    <section class="px-6 py-16 md:py-28">
      <div class="max-w-6xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <NeuBadge
              variant="primary"
              class="mb-6"
            >
              #1 Workforce Management Platform
            </NeuBadge>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--neu-text)] mb-6 leading-tight">
              Scheduling made
              <span class="text-[var(--neu-primary)]">simple</span>
            </h1>

            <p class="text-lg md:text-xl text-[var(--neu-text-muted)] mb-8 leading-relaxed">
              The all-in-one workforce management platform that helps you schedule smarter,
              track time accurately, and keep your team connected.
            </p>

            <div class="flex flex-wrap gap-4 mb-10">
              <NuxtLink to="/register">
                <NeuButton
                  variant="primary"
                  size="lg"
                >
                  Start Free Trial
                </NeuButton>
              </NuxtLink>
              <NeuButton
                size="lg"
                @click="contactModalOpen = true"
              >
                Book a Demo
              </NeuButton>
            </div>

            <p class="text-sm text-[var(--neu-text-muted)]">
              No credit card required. 14-day free trial.
            </p>
          </div>

          <!-- Hero Demo Card -->
          <div>
            <NeuCard padding="lg">
              <div class="space-y-4">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-[var(--neu-text)]">Today's Schedule</h3>
                  <NeuBadge variant="success">Live</NeuBadge>
                </div>

                <!-- Schedule Items -->
                <div class="space-y-3">
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
                    <NeuAvatar
                      initials="JD"
                      size="sm"
                      status="online"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-medium text-[var(--neu-text)]">John Davis</p>
                      <p class="text-xs text-[var(--neu-text-muted)]">9:00 AM - 5:00 PM</p>
                    </div>
                    <NeuBadge
                      variant="success"
                      size="sm"
                    >On shift</NeuBadge>
                  </div>

                  <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
                    <NeuAvatar
                      initials="SM"
                      size="sm"
                      status="away"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-medium text-[var(--neu-text)]">Sarah Miller</p>
                      <p class="text-xs text-[var(--neu-text-muted)]">12:00 PM - 8:00 PM</p>
                    </div>
                    <NeuBadge size="sm">Starting soon</NeuBadge>
                  </div>

                  <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--neu-bg-secondary)]">
                    <NeuAvatar
                      initials="MK"
                      size="sm"
                      status="busy"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-medium text-[var(--neu-text)]">Mike Kim</p>
                      <p class="text-xs text-[var(--neu-text-muted)]">On break until 2:30 PM</p>
                    </div>
                    <NeuBadge
                      variant="warning"
                      size="sm"
                    >Break</NeuBadge>
                  </div>
                </div>

                <div class="pt-4 border-t border-[var(--neu-shadow-dark)]/10">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-[var(--neu-text-muted)]">Team coverage</span>
                    <span class="font-medium text-[var(--neu-text)]">87%</span>
                  </div>
                  <NeuProgress
                    :value="87"
                    variant="primary"
                    size="sm"
                    class="mt-2"
                  />
                </div>
              </div>
            </NeuCard>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="px-6 py-12 bg-[var(--neu-bg-secondary)]">
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="text-center"
          >
            <p class="text-3xl md:text-4xl font-bold text-[var(--neu-primary)] mb-1">
              {{ stat.value }}
            </p>
            <p class="text-sm text-[var(--neu-text-muted)]">
              {{ stat.label }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section
      id="features"
      class="px-6 py-20"
    >
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <NeuBadge class="mb-4">Features</NeuBadge>
          <h2 class="text-3xl md:text-4xl font-bold text-[var(--neu-text)] mb-4">
            Everything you need to manage your workforce
          </h2>
          <p class="text-lg text-[var(--neu-text-muted)] max-w-2xl mx-auto">
            From scheduling to payroll prep, Optivo has the tools to streamline your operations.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NeuCard
            v-for="feature in features"
            :key="feature.title"
          >
            <div class="w-12 h-12 rounded-xl bg-[var(--neu-primary)]/10 flex items-center justify-center mb-4">
              <span class="text-2xl">{{ feature.icon }}</span>
            </div>
            <h3 class="text-xl font-semibold text-[var(--neu-text)] mb-2">
              {{ feature.title }}
            </h3>
            <p class="text-[var(--neu-text-muted)]">
              {{ feature.description }}
            </p>
          </NeuCard>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="px-6 py-20 bg-[var(--neu-bg-secondary)]">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <NeuBadge class="mb-4">Testimonials</NeuBadge>
          <h2 class="text-3xl md:text-4xl font-bold text-[var(--neu-text)] mb-4">
            Trusted by teams everywhere
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <NeuCard
            v-for="testimonial in testimonials"
            :key="testimonial.author"
            padding="lg"
          >
            <p class="text-[var(--neu-text)] mb-6 italic">
              "{{ testimonial.quote }}"
            </p>
            <div class="flex items-center gap-3">
              <NeuAvatar
                :initials="testimonial.author.split(' ').map(n => n[0]).join('')"
                size="sm"
              />
              <div>
                <p class="font-medium text-[var(--neu-text)]">{{ testimonial.author }}</p>
                <p class="text-sm text-[var(--neu-text-muted)]">{{ testimonial.role }}, {{ testimonial.company }}</p>
              </div>
            </div>
          </NeuCard>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section
      id="pricing"
      class="px-6 py-20"
    >
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <NeuBadge class="mb-4">Pricing</NeuBadge>
          <h2 class="text-3xl md:text-4xl font-bold text-[var(--neu-text)] mb-4">
            Simple, transparent pricing
          </h2>
          <p class="text-lg text-[var(--neu-text-muted)]">
            Per employee, per month. No hidden fees.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <NeuCard
            v-for="plan in pricingPlans"
            :key="plan.name"
            :variant="plan.popular ? 'convex' : 'flat'"
            padding="lg"
            :class="{ 'ring-2 ring-[var(--neu-primary)]': plan.popular }"
          >
            <div v-if="plan.popular" class="mb-4">
              <NeuBadge variant="primary">Most Popular</NeuBadge>
            </div>
            <h3 class="text-xl font-semibold text-[var(--neu-text)] mb-2">
              {{ plan.name }}
            </h3>
            <div class="mb-4">
              <span class="text-4xl font-bold text-[var(--neu-text)]">${{ plan.price }}</span>
              <span class="text-[var(--neu-text-muted)]">/employee/mo</span>
            </div>
            <p class="text-sm text-[var(--neu-text-muted)] mb-6">
              {{ plan.description }}
            </p>
            <ul class="space-y-3 mb-8">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-center gap-2 text-sm text-[var(--neu-text)]"
              >
                <span class="text-[var(--neu-success)]">✓</span>
                {{ feature }}
              </li>
            </ul>
            <NuxtLink to="/register" class="block">
              <NeuButton
                :variant="plan.popular ? 'primary' : 'default'"
                class="w-full"
              >
                Get Started
              </NeuButton>
            </NuxtLink>
          </NeuCard>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section
      id="about"
      class="px-6 py-20 bg-[var(--neu-bg-secondary)]"
    >
      <div class="max-w-4xl mx-auto text-center">
        <NeuBadge class="mb-4">About Us</NeuBadge>
        <h2 class="text-3xl md:text-4xl font-bold text-[var(--neu-text)] mb-6">
          Built by operators, for operators
        </h2>
        <p class="text-lg text-[var(--neu-text-muted)] mb-8 leading-relaxed">
          We spent years managing hourly teams and dealing with spreadsheets,
          text message scheduling, and payroll headaches. Optivo was born from
          the frustration of not having a tool that just worked. Today, we're proud
          to help thousands of businesses run smoother operations.
        </p>
        <div class="flex justify-center gap-4">
          <NeuButton
            variant="primary"
            @click="contactModalOpen = true"
          >
            Contact Us
          </NeuButton>
          <NeuButton variant="ghost">
            Our Story
          </NeuButton>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="px-6 py-20">
      <div class="max-w-3xl mx-auto">
        <NeuCard padding="lg">
          <div class="text-center">
            <h2 class="text-3xl font-bold text-[var(--neu-text)] mb-4">
              Ready to simplify your scheduling?
            </h2>
            <p class="text-lg text-[var(--neu-text-muted)] mb-8">
              Join thousands of teams who've made the switch. Start your free trial today.
            </p>
            <div class="flex flex-wrap justify-center gap-4">
              <NuxtLink to="/register">
                <NeuButton
                  variant="primary"
                  size="lg"
                >
                  Start Free Trial
                </NeuButton>
              </NuxtLink>
              <NeuButton
                size="lg"
                @click="contactModalOpen = true"
              >
                Talk to Sales
              </NeuButton>
            </div>
          </div>
        </NeuCard>
      </div>
    </section>

    <!-- Footer -->
    <footer class="px-6 py-12 border-t border-[var(--neu-shadow-dark)]/10">
      <div class="max-w-6xl mx-auto">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-lg bg-[var(--neu-primary)] flex items-center justify-center text-white font-bold text-sm">
                OP
              </div>
              <span class="font-semibold text-[var(--neu-text)]">Optivo</span>
            </div>
            <p class="text-sm text-[var(--neu-text-muted)]">
              The modern workforce management platform for growing teams.
            </p>
          </div>
          <div>
            <h4 class="font-semibold text-[var(--neu-text)] mb-4">Product</h4>
            <ul class="space-y-2 text-sm text-[var(--neu-text-muted)]">
              <li><a href="#features" class="hover:text-[var(--neu-text)]">Features</a></li>
              <li><a href="#pricing" class="hover:text-[var(--neu-text)]">Pricing</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Integrations</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">API</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-[var(--neu-text)] mb-4">Company</h4>
            <ul class="space-y-2 text-sm text-[var(--neu-text-muted)]">
              <li><a href="#about" class="hover:text-[var(--neu-text)]">About</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Blog</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Careers</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-[var(--neu-text)] mb-4">Legal</h4>
            <ul class="space-y-2 text-sm text-[var(--neu-text-muted)]">
              <li><a href="#" class="hover:text-[var(--neu-text)]">Privacy</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Terms</a></li>
              <li><a href="#" class="hover:text-[var(--neu-text)]">Security</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-[var(--neu-shadow-dark)]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-sm text-[var(--neu-text-muted)]">
            © 2025 Optivo. All rights reserved.
          </p>
          <div class="flex items-center gap-4">
            <button
              class="text-sm text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]"
              @click="setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')"
            >
              {{ effectiveTheme === 'dark' ? '☀️ Light' : '🌙 Dark' }}
            </button>
          </div>
        </div>
      </div>
    </footer>

    <!-- Contact Modal -->
    <NeuModal
      v-model="contactModalOpen"
      title="Book a Demo"
    >
      <div class="space-y-4">
        <NeuInput
          label="Your Name"
          placeholder="John Smith"
        />
        <NeuInput
          label="Work Email"
          type="email"
          placeholder="you@company.com"
        />
        <NeuInput
          label="Phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
        />
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">
            Team Size
          </label>
          <NeuSelect
            :options="[
              { label: '1-25 employees', value: 'small' },
              { label: '26-100 employees', value: 'medium' },
              { label: '101-500 employees', value: 'large' },
              { label: '500+ employees', value: 'enterprise' }
            ]"
            placeholder="Select team size..."
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NeuButton @click="contactModalOpen = false">
            Cancel
          </NeuButton>
          <NeuButton
            variant="primary"
            @click="contactModalOpen = false"
          >
            Book Demo
          </NeuButton>
        </div>
      </template>
    </NeuModal>
  </div>
</template>
