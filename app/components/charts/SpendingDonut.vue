<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js'
import { TAILWIND_HEX } from '~/utils/categories'
import { formatCurrency } from '~/utils/formatters'
import type { Person } from '~/types'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  person?: Person
}>()

const store = useTransactionsStore()

const byCat = computed(() => store.byCategory(props.person))

const hasData = computed(() =>
  Object.values(byCat.value).some(v => (v as number) > 0)
)

const topCategories = computed(() =>
  store.allCategories
    .filter(c => c.key !== 'revenus' && (byCat.value[c.key] ?? 0) > 0)
    .map(c => ({ ...c, amount: byCat.value[c.key] ?? 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
)

const totalDep = computed(() =>
  topCategories.value.reduce((s, c) => s + c.amount, 0)
)

const chartData = computed(() => ({
  labels: topCategories.value.map(c => c.label),
  datasets: [{
    data: topCategories.value.map(c => c.amount),
    backgroundColor: topCategories.value.map(c => TAILWIND_HEX[c.color] ?? '#6b7280'),
    borderWidth: 0,
    hoverOffset: 4
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'doughnut'>) => ` ${formatCurrency(ctx.raw as number)}`
      }
    }
  }
}))
</script>

<template>
  <div>
    <div
      v-if="!hasData"
      class="h-48 flex items-center justify-center"
    >
      <p class="text-sm text-muted">
        Pas de données
      </p>
    </div>

    <div
      v-else
      class="flex gap-6 items-center"
    >
      <div class="relative w-44 h-44 shrink-0">
        <Doughnut
          :data="chartData"
          :options="chartOptions"
        />
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span class="text-xs text-muted">Dépenses</span>
          <span class="text-base font-bold text-default tabular-nums">
            {{ formatCurrency(totalDep) }}
          </span>
        </div>
      </div>

      <div class="flex-1 space-y-1.5 min-w-0">
        <div
          v-for="cat in topCategories"
          :key="cat.key"
          class="flex items-center gap-2"
        >
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: TAILWIND_HEX[cat.color] ?? '#6b7280' }"
          />
          <span class="text-xs text-default flex-1 truncate">{{ cat.label }}</span>
          <span class="text-xs font-medium text-default tabular-nums shrink-0">
            {{ formatCurrency(cat.amount) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
