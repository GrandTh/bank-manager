<script setup lang="ts">
import { formatCurrency } from '~/utils/formatters'

const props = defineProps<{
  label: string
  amount: number
  icon: string
  color?: 'emerald' | 'rose' | 'violet' | 'sky' | 'slate'
  trend?: number // % vs previous period
}>()

const colorClass = computed(() => ({
  emerald: 'text-emerald-500 bg-emerald-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  violet: 'text-primary bg-primary/10',
  sky: 'text-sky-500 bg-sky-500/10',
  slate: 'text-(--ui-text-muted) bg-(--ui-bg-elevated)'
})[props.color ?? 'slate'])
</script>

<template>
  <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-(--ui-text-muted) font-medium">{{ label }}</span>
      <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-base', colorClass]">
        <UIcon :name="icon" />
      </div>
    </div>

    <div class="flex items-end justify-between gap-2">
      <span class="text-2xl font-bold text-(--ui-text) tabular-nums">
        {{ formatCurrency(amount) }}
      </span>

      <div
        v-if="trend !== undefined"
        class="flex items-center gap-0.5 text-xs font-medium mb-0.5"
        :class="trend >= 0 ? 'text-emerald-500' : 'text-rose-500'"
      >
        <UIcon
          :name="trend >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
          class="text-xs"
        />
        {{ Math.abs(trend).toFixed(1) }}%
      </div>
    </div>
  </div>
</template>
