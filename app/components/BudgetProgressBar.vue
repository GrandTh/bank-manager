<script setup lang="ts">
import { formatCurrency } from '~/utils/formatters'
import type { Person } from '~/types'

const props = defineProps<{
  person: Person
  categoryKey: string
}>()

const store = useTransactionsStore()

const meta = computed(() => store.categoryMap[props.categoryKey])
const budget = computed(() => store.budgetFor(props.person, props.categoryKey))
const spent = computed(() => store.byCategory(props.person)[props.categoryKey] ?? 0)
const rawPct = computed(() => budget.value ? (spent.value / budget.value.amount) * 100 : 0)
const pct = computed(() => Math.min(rawPct.value, 100))
const over = computed(() => budget.value ? spent.value > budget.value.amount : false)
const warning = computed(() => !over.value && rawPct.value >= 80)

const barColor = computed(() => {
  if (over.value) return 'bg-rose-500'
  if (warning.value) return 'bg-amber-400'
  return 'bg-emerald-500'
})
</script>

<template>
  <div
    v-if="meta && budget"
    class="flex items-center gap-3"
  >
    <!-- Icon -->
    <div
      class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
      :class="`text-${meta.color}-500 bg-${meta.color}-500/10`"
    >
      <UIcon :name="meta.icon" />
    </div>

    <!-- Label + bar -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-xs font-medium text-default truncate">{{ meta.label }}</span>
          <UIcon
            v-if="over"
            name="i-lucide-circle-x"
            class="text-rose-500 shrink-0 text-xs"
          />
          <UIcon
            v-else-if="warning"
            name="i-lucide-triangle-alert"
            class="text-amber-400 shrink-0 text-xs"
          />
        </div>
        <span
          class="text-xs tabular-nums shrink-0 ml-2"
          :class="over ? 'text-rose-500 font-semibold' : warning ? 'text-amber-400 font-medium' : 'text-muted'"
        >
          {{ formatCurrency(spent) }} / {{ formatCurrency(budget.amount) }}
        </span>
      </div>
      <div class="h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="barColor"
          :style="{ width: `${pct}%` }"
        />
      </div>
      <p
        v-if="over"
        class="text-xs text-rose-500 mt-0.5"
      >
        Dépassé de {{ formatCurrency(spent - budget.amount) }}
      </p>
    </div>
  </div>
</template>
