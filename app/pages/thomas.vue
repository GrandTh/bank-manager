<script setup lang="ts">
import { formatYearMonth } from '~/utils/formatters'

useSeoMeta({ title: 'Thomas · Budget' })

const store = useTransactionsStore()

const revenus = computed(() => store.totalCredits('thomas'))
const depenses = computed(() => store.totalDebits('thomas'))
const solde = computed(() => revenus.value - depenses.value)

const prevMonth = computed(() =>
  store.previousYearMonth ? store.totalsForMonth('thomas', store.previousYearMonth) : null
)

const trendRevenus = computed(() => {
  if (!prevMonth.value?.credits) return undefined
  return ((revenus.value - prevMonth.value.credits) / prevMonth.value.credits) * 100
})

const trendDepenses = computed(() => {
  if (!prevMonth.value?.debits) return undefined
  return -((depenses.value - prevMonth.value.debits) / prevMonth.value.debits) * 100
})

const trendSolde = computed(() => {
  if (!prevMonth.value) return undefined
  const prev = prevMonth.value.credits - prevMonth.value.debits
  if (prev === 0) return undefined
  return ((solde.value - prev) / Math.abs(prev)) * 100
})

const epargneCategory = computed(() =>
  store.allCategories.find(c => c.label.toLowerCase().includes('pargne'))
)
const epargne = computed(() =>
  epargneCategory.value ? (store.byCategory('thomas')[epargneCategory.value.key] ?? 0) : 0
)

const period = computed(() =>
  store.currentYearMonth ? formatYearMonth(store.currentYearMonth) : 'Toutes périodes'
)

const hasData = computed(() => store.filteredFor('thomas').length > 0)
const thomasBudgets = computed(() => store.budgets.filter(b => b.person === 'thomas'))
const thomasGoals = computed(() => store.goals.filter(g => g.scope === 'commun' || g.scope === 'thomas'))
const thomasAlerts = computed(() => store.budgetAlerts('thomas'))
</script>

<template>
  <div class="flex flex-col p-6 gap-6">
    <div class="flex items-center gap-3 shrink-0">
      <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
        <UIcon
          name="i-lucide-user"
          class="text-blue-500 text-lg"
        />
      </div>
      <div>
        <h1 class="text-xl font-bold text-default">
          Thomas
        </h1>
        <p class="text-sm text-muted">
          {{ period }}
        </p>
      </div>
    </div>

    <div
      v-if="!hasData"
      class="flex flex-col items-center justify-center py-16 gap-3"
    >
      <UIcon
        name="i-lucide-inbox"
        class="text-4xl text-muted"
      />
      <p class="text-sm text-muted">
        Aucune transaction — importez un relevé CSV pour Thomas.
      </p>
    </div>

    <template v-else>
      <!-- Stats -->
      <div
        class="grid gap-3 shrink-0"
        :class="epargneCategory ? 'grid-cols-4' : 'grid-cols-3'"
      >
        <StatCard
          label="Revenus"
          :amount="revenus"
          icon="i-lucide-banknote"
          color="emerald"
          :trend="trendRevenus"
        />
        <StatCard
          label="Dépenses"
          :amount="depenses"
          icon="i-lucide-credit-card"
          color="rose"
          :trend="trendDepenses"
        />
        <StatCard
          label="Solde"
          :amount="solde"
          icon="i-lucide-scale"
          :color="solde >= 0 ? 'emerald' : 'rose'"
          :trend="trendSolde"
        />
        <StatCard
          v-if="epargneCategory"
          label="Épargne"
          :amount="epargne"
          icon="i-lucide-piggy-bank"
          color="violet"
        />
      </div>
      <!-- Charts + Transactions -->
      <div class="flex gap-4 h-[calc(100dvh-240px)]">
        <!-- Left: charts stacked -->
        <div class="flex flex-col gap-4 w-1/2">
          <div class="rounded-xl border border-default bg-default p-4 flex-1 min-h-0">
            <h3 class="text-sm font-semibold text-default mb-4">
              Dépenses par catégorie
            </h3>
            <ClientOnly><ChartsSpendingDonut person="thomas" /></ClientOnly>
          </div>
          <div class="rounded-xl border border-default bg-default p-4 flex-1 min-h-0">
            <h3 class="text-sm font-semibold text-default mb-4">
              Évolution sur 6 mois
            </h3>
            <ClientOnly>
              <ChartsMonthlyBar
                person="thomas"
                :months="6"
              />
            </ClientOnly>
          </div>
        </div>

        <!-- Right: transactions full height -->
        <div class="flex-1 overflow-hidden rounded-xl border border-default bg-default flex flex-col">
          <div class="px-4 pt-4 shrink-0">
            <h3 class="text-sm font-semibold text-default mb-3">
              Transactions
            </h3>
          </div>
          <AnimatedTransactionList person="thomas" />
        </div>
      </div>

      <!-- Budgets + Objectifs (below, scroll avec la page) -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Budgets -->
        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-default">
                Budgets
              </h3>
              <UBadge
                v-if="thomasAlerts.over > 0"
                :label="`${thomasAlerts.over} dépassé${thomasAlerts.over > 1 ? 's' : ''}`"
                color="error"
                variant="subtle"
                size="xs"
              />
              <UBadge
                v-else-if="thomasAlerts.warning > 0"
                :label="`${thomasAlerts.warning} proche${thomasAlerts.warning > 1 ? 's' : ''}`"
                color="warning"
                variant="subtle"
                size="xs"
              />
            </div>
            <BudgetsModal person="thomas" />
          </div>
          <div
            v-if="thomasBudgets.length"
            class="space-y-3"
          >
            <BudgetProgressBar
              v-for="b in thomasBudgets"
              :key="b.id"
              person="thomas"
              :category-key="b.categoryKey"
            />
          </div>
          <p
            v-else
            class="text-xs text-muted text-center py-2"
          >
            Aucun budget — cliquez sur Budgets pour en ajouter.
          </p>
        </div>

        <!-- Objectifs -->
        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-default">
              Objectifs
            </h3>
            <GoalsModal person="thomas" inline />
          </div>
          <div
            v-if="thomasGoals.length"
            class="space-y-2"
          >
            <GoalProgressCard
              v-for="g in thomasGoals"
              :key="g.id"
              :goal="g"
            />
          </div>
          <p
            v-else
            class="text-xs text-muted text-center py-2"
          >
            Aucun objectif — cliquez sur Objectifs pour en ajouter.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
