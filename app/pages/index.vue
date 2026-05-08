<script setup lang="ts">
import { formatCurrency, formatYearMonth } from '~/utils/formatters'

useSeoMeta({ title: 'Vue commune · Budget' })

const store = useTransactionsStore()

const totalRevenues = computed(() =>
  store.totalCredits('thomas') + store.totalCredits('emma')
)
const totalDepenses = computed(() =>
  store.totalDebits('thomas') + store.totalDebits('emma')
)
const solde = computed(() => totalRevenues.value - totalDepenses.value)
const epargne = computed(() =>
  totalRevenues.value > 0
    ? ((solde.value / totalRevenues.value) * 100)
    : 0
)

const epargneCategory = computed(() =>
  store.allCategories.find(c => c.label.toLowerCase().includes('pargne'))
)
const epargneAmount = computed(() => {
  if (!epargneCategory.value) return 0
  const key = epargneCategory.value.key
  return (store.byCategory('thomas')[key] ?? 0) + (store.byCategory('emma')[key] ?? 0)
})

const period = computed(() =>
  store.currentYearMonth ? formatYearMonth(store.currentYearMonth) : 'Toutes périodes'
)

const hasData = computed(() => store.transactions.length > 0)
const communGoals = computed(() => store.goals.filter(g => g.scope === 'commun'))
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-default">
          Vue commune
        </h1>
        <p class="text-sm text-muted">
          {{ period }}
        </p>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!hasData"
      class="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <UIcon
          name="i-lucide-wallet"
          class="text-3xl text-primary"
        />
      </div>
      <div class="text-center">
        <p class="text-lg font-semibold text-default">
          Aucune donnée
        </p>
        <p class="text-sm text-muted mt-1">
          Importez vos relevés CSV via le bouton "Importer CSV" dans la sidebar.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-3">
        <StatCard
          label="Revenus du mois"
          :amount="totalRevenues"
          icon="i-lucide-banknote"
          color="emerald"
        />
        <StatCard
          label="Dépenses du mois"
          :amount="totalDepenses"
          icon="i-lucide-credit-card"
          color="rose"
        />
        <StatCard
          label="Solde"
          :amount="solde"
          icon="i-lucide-scale"
          :color="solde >= 0 ? 'emerald' : 'rose'"
        />
        <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted font-medium">Taux d'épargne</span>
            <div class="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-piggy-bank"
                class="text-primary text-base"
              />
            </div>
          </div>
          <div class="flex items-end justify-between gap-2">
            <span
              class="text-2xl font-bold tabular-nums"
              :class="epargne >= 0 ? 'text-emerald-500' : 'text-rose-500'"
            >
              {{ epargne.toFixed(1) }}%
            </span>
            <span
              v-if="epargneAmount > 0"
              class="text-xs font-medium text-violet-500 mb-0.5 tabular-nums"
            >
              +{{ formatCurrency(epargneAmount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Thomas vs Emma -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-user"
                class="text-blue-500 text-xs"
              />
            </div>
            <span class="text-sm font-semibold text-default">Thomas</span>
          </div>
          <div class="flex gap-4">
            <div>
              <p class="text-xs text-muted">
                Revenus
              </p>
              <p class="text-base font-bold text-emerald-500 tabular-nums">
                {{ formatCurrency(store.totalCredits('thomas')) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted">
                Dépenses
              </p>
              <p class="text-base font-bold text-default tabular-nums">
                {{ formatCurrency(store.totalDebits('thomas')) }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-full bg-pink-500/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-user"
                class="text-pink-500 text-xs"
              />
            </div>
            <span class="text-sm font-semibold text-default">Emma</span>
          </div>
          <div class="flex gap-4">
            <div>
              <p class="text-xs text-muted">
                Revenus
              </p>
              <p class="text-base font-bold text-emerald-500 tabular-nums">
                {{ formatCurrency(store.totalCredits('emma')) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted">
                Dépenses
              </p>
              <p class="text-base font-bold text-default tabular-nums">
                {{ formatCurrency(store.totalDebits('emma')) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-xl border border-default bg-default p-4">
          <h3 class="text-sm font-semibold text-default mb-4">
            Dépenses par catégorie
          </h3>
          <ClientOnly>
            <ChartsSpendingDonut />
          </ClientOnly>
        </div>

        <div class="rounded-xl border border-default bg-default p-4">
          <h3 class="text-sm font-semibold text-default mb-4">
            Évolution mensuelle
          </h3>
          <ClientOnly>
            <ChartsMonthlyBar :months="6" />
          </ClientOnly>
        </div>
      </div>

      <!-- Recent transactions + Objectifs communs -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-default">
              Dernières transactions
            </h3>
            <div class="flex gap-2">
              <UBadge
                color="neutral"
                variant="subtle"
                label="Thomas"
              />
              <UBadge
                color="neutral"
                variant="subtle"
                label="Emma"
              />
            </div>
          </div>
          <TransactionList :limit="8" />
        </div>

        <!-- Objectifs communs -->
        <div class="rounded-xl border border-default bg-default p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-default">
              Objectifs communs
            </h3>
            <GoalsModal inline />
          </div>
          <div
            v-if="communGoals.length"
            class="space-y-2"
          >
            <GoalProgressCard
              v-for="g in communGoals"
              :key="g.id"
              :goal="g"
            />
          </div>
          <p
            v-else
            class="text-xs text-muted text-center py-4"
          >
            Aucun objectif commun — cliquez sur Objectifs pour en ajouter.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
