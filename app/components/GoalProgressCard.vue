<script setup lang="ts">
import { TAILWIND_HEX } from '~/utils/categories'
import { formatCurrency } from '~/utils/formatters'
import type { Goal } from '~/types'

const props = defineProps<{ goal: Goal }>()

const store = useTransactionsStore()

const saved = computed(() => store.totalForGoal(props.goal))
const pct = computed(() => Math.min(Math.max((saved.value / props.goal.targetAmount) * 100, 0), 100))
const remaining = computed(() => Math.max(props.goal.targetAmount - saved.value, 0))
const color = computed(() => TAILWIND_HEX[props.goal.color] ?? '#6b7280')
const isComplete = computed(() => saved.value >= props.goal.targetAmount)
</script>

<template>
  <div class="flex flex-col gap-2 p-3 rounded-lg border border-default bg-elevated/40">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <div
        class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        :style="{ background: color + '20', color }"
      >
        <UIcon
          :name="goal.icon"
          class="text-sm"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-default truncate">
          {{ goal.label }}
        </p>
        <p class="text-xs text-muted">
          {{ goal.scope === 'commun' ? 'Commun' : goal.scope === 'thomas' ? 'Thomas' : 'Emma' }}
        </p>
      </div>
      <div class="text-right shrink-0">
        <p
          class="text-sm font-bold tabular-nums"
          :style="{ color: isComplete ? '#10b981' : color }"
        >
          {{ formatCurrency(saved) }}
        </p>
        <p class="text-xs text-muted tabular-nums">
          / {{ formatCurrency(goal.targetAmount) }}
        </p>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 rounded-full bg-default overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: `${pct}%`, background: isComplete ? '#10b981' : color }"
      />
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted">
        {{ pct.toFixed(0) }}%
      </span>
      <span
        v-if="isComplete"
        class="text-xs font-medium text-emerald-500"
      >
        Objectif atteint 🎉
      </span>
      <span
        v-else
        class="text-xs text-muted tabular-nums"
      >
        {{ formatCurrency(remaining) }} restants
      </span>
    </div>
  </div>
</template>
