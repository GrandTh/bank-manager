<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type TooltipItem
} from 'chart.js'
import { formatYearMonth, formatCurrency } from '~/utils/formatters'
import type { Person } from '~/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  person?: Person
  months?: number
}>()

const store = useTransactionsStore()
const colorMode = useColorMode()

const totals = computed(() => store.monthlyTotals(props.person, props.months ?? 6))

const hasData = computed(() => totals.value.some(t => t.debits > 0 || t.credits > 0))

const gridColor = computed(() =>
  colorMode.value === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
)
const tickColor = computed(() =>
  colorMode.value === 'dark' ? '#64748b' : '#94a3b8'
)
const legendColor = computed(() =>
  colorMode.value === 'dark' ? '#94a3b8' : '#64748b'
)

const chartData = computed(() => ({
  labels: totals.value.map(t => formatYearMonth(t.yearMonth)),
  datasets: [
    {
      label: 'Dépenses',
      data: totals.value.map(t => t.debits),
      backgroundColor: 'rgba(244, 63, 94, 0.8)',
      borderRadius: 4,
      borderSkipped: false as const
    },
    {
      label: 'Revenus',
      data: totals.value.map(t => t.credits),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 4,
      borderSkipped: false as const
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: legendColor.value,
        boxWidth: 10,
        boxHeight: 10,
        borderRadius: 3,
        useBorderRadius: true,
        font: { size: 11 }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) =>
          ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: gridColor.value },
      ticks: { color: tickColor.value, font: { size: 10 } }
    },
    y: {
      grid: { color: gridColor.value },
      ticks: {
        color: tickColor.value,
        font: { size: 10 },
        callback: (value: number | string) =>
          typeof value === 'number' && value >= 1000
            ? `${(value / 1000).toFixed(0)}k€`
            : `${value}€`
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
      class="h-52"
    >
      <Bar
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>
