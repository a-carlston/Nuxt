<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
}

defineProps<Props>()
</script>

<template>
  <div class="neu-card-form">
    <!-- Header -->
    <div
      v-if="title || $slots.header"
      class="neu-card-form-header px-6 py-5 border-b border-[var(--neu-shadow-dark)]/10"
    >
      <slot name="header">
        <h2 class="text-xl font-semibold text-[var(--neu-text)]">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-sm text-[var(--neu-text-muted)] mt-1">
          {{ subtitle }}
        </p>
      </slot>
    </div>

    <!-- Content -->
    <div class="neu-card-form-content px-6 py-6">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      class="neu-card-form-footer px-6 py-4 border-t border-[var(--neu-shadow-dark)]/10"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.neu-card-form {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
}

.neu-card-form-header {
  background: var(--neu-bg);
  border-radius: 1rem 1rem 0 0;
  flex-shrink: 0;
}

.neu-card-form-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--neu-text-muted) transparent;
}

.neu-card-form-content::-webkit-scrollbar {
  width: 6px;
}

.neu-card-form-content::-webkit-scrollbar-track {
  background: transparent;
}

.neu-card-form-content::-webkit-scrollbar-thumb {
  background-color: var(--neu-text-muted);
  border-radius: 3px;
}

.neu-card-form-footer {
  background: var(--neu-bg-secondary);
  border-radius: 0 0 1rem 1rem;
  flex-shrink: 0;
}
</style>
