<script setup lang="ts">
import { TAILWIND_HEX } from '~/utils/categories'
import type { Goal, Person } from '~/types'

const props = defineProps<{ person?: Person, inline?: boolean }>()

const store = useTransactionsStore()
const toast = useToast()
const collapsed = useNavCollapsed()

const label = ref('')
const selectedIcon = ref('i-lucide-target')
const selectedColor = ref('violet')
const targetAmount = ref<number | null>(null)
const scope = ref<'commun' | Person>(props.person ?? 'commun')
const isAdding = ref(false)
const deletingId = ref<string | null>(null)

const COLOR_OPTIONS = Object.entries(TAILWIND_HEX).map(([name, hex]) => ({ name, hex }))

const ICON_OPTIONS = [
  { label: 'Cible', value: 'i-lucide-target' },
  { label: 'Avion', value: 'i-lucide-plane' },
  { label: 'Voiture', value: 'i-lucide-car' },
  { label: 'Maison', value: 'i-lucide-house' },
  { label: 'Cadeau', value: 'i-lucide-gift' },
  { label: 'Étoile', value: 'i-lucide-star' },
  { label: 'Trophée', value: 'i-lucide-trophy' },
  { label: 'Vélo', value: 'i-lucide-bike' },
  { label: 'Bateau', value: 'i-lucide-ship' },
  { label: 'Caméra', value: 'i-lucide-camera' },
  { label: 'Musique', value: 'i-lucide-music' },
  { label: 'Livre', value: 'i-lucide-book' },
  { label: 'Dumbbell', value: 'i-lucide-dumbbell' },
  { label: 'Bague', value: 'i-lucide-gem' },
  { label: 'Tirelire', value: 'i-lucide-piggy-bank' }
]

const SCOPE_OPTIONS = [
  { label: 'Commun (Thomas + Emma)', value: 'commun' },
  { label: 'Thomas uniquement', value: 'thomas' },
  { label: 'Emma uniquement', value: 'emma' }
]

function toSlug(s: string): string {
  return 'goal-' + s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'objectif'
}

const canAdd = computed(() =>
  label.value.trim().length >= 2 && targetAmount.value !== null && targetAmount.value > 0
)

const visibleGoals = computed(() => {
  if (!props.person) return store.goals
  return store.goals.filter(g => g.scope === 'commun' || g.scope === props.person)
})

async function addGoal() {
  if (!canAdd.value || targetAmount.value === null) return
  const slug = toSlug(label.value.trim())
  const categoryKey = store.allCategories.some(c => c.key === slug)
    ? `${slug}-${Date.now()}`
    : slug

  const goal: Goal = {
    id: crypto.randomUUID(),
    label: label.value.trim(),
    icon: selectedIcon.value,
    color: selectedColor.value,
    targetAmount: targetAmount.value,
    scope: scope.value,
    categoryKey,
    createdAt: new Date().toISOString()
  }

  isAdding.value = true
  try {
    await store.addGoal(goal)
    toast.add({ title: 'Objectif créé', color: 'success', duration: 2000 })
    label.value = ''
    targetAmount.value = null
    selectedIcon.value = 'i-lucide-target'
    selectedColor.value = 'violet'
  }
  finally {
    isAdding.value = false
  }
}

async function removeGoal(id: string) {
  deletingId.value = id
  try {
    await store.removeGoal(id)
    toast.add({ title: 'Objectif supprimé', color: 'success', duration: 2000 })
  }
  finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UModal title="Objectifs">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-target"
      :label="(!props.inline && collapsed) ? undefined : 'Objectifs'"
      :block="!props.inline && !collapsed"
    />

    <template #body>
      <div class="space-y-5">
        <!-- Existing goals -->
        <div v-if="visibleGoals.length">
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Mes objectifs
          </p>
          <div class="space-y-2">
            <div
              v-for="g in visibleGoals"
              :key="g.id"
              class="flex items-center gap-3 px-3 py-2 rounded-lg border border-default"
            >
              <div
                class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                :style="{ background: (TAILWIND_HEX[g.color] ?? '#6b7280') + '20', color: TAILWIND_HEX[g.color] ?? '#6b7280' }"
              >
                <UIcon :name="g.icon" class="text-sm" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-default font-medium truncate">
                  {{ g.label }}
                </p>
                <p class="text-xs text-muted">
                  {{ g.scope === 'commun' ? 'Commun' : g.scope === 'thomas' ? 'Thomas' : 'Emma' }} · {{ g.targetAmount.toLocaleString('fr-FR') }} €
                </p>
              </div>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :loading="deletingId === g.id"
                @click="removeGoal(g.id)"
              />
            </div>
          </div>
        </div>

        <!-- Add form -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Ajouter un objectif
          </p>
          <div class="space-y-3">
            <UInput
              v-model="label"
              placeholder="Nom de l'objectif (ex: Vacances)"
              icon="i-lucide-pencil"
              @keyup.enter="addGoal"
            />

            <UInput
              v-model.number="targetAmount"
              type="number"
              placeholder="Montant cible (€)"
              icon="i-lucide-euro"
              :min="1"
            />

            <USelect
              v-model="scope"
              :items="SCOPE_OPTIONS"
              value-key="value"
              label-key="label"
              size="sm"
            />

            <!-- Icon -->
            <div>
              <p class="text-xs text-muted mb-1.5">
                Icône
              </p>
              <USelect
                v-model="selectedIcon"
                :items="ICON_OPTIONS"
                value-key="value"
                label-key="label"
                size="sm"
              />
            </div>

            <!-- Color -->
            <div>
              <p class="text-xs text-muted mb-1.5">
                Couleur
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="col in COLOR_OPTIONS"
                  :key="col.name"
                  class="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  :style="{ background: col.hex }"
                  :class="selectedColor === col.name ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''"
                  @click="selectedColor = col.name"
                />
              </div>
            </div>

            <div class="flex items-center gap-3 pt-1">
              <div
                v-if="label.trim()"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :style="{
                  background: (TAILWIND_HEX[selectedColor] ?? '#6b7280') + '20',
                  color: TAILWIND_HEX[selectedColor] ?? '#6b7280'
                }"
              >
                <UIcon :name="selectedIcon" class="text-xs" />
                {{ label.trim() }}
              </div>
              <div class="flex-1" />
              <UButton
                icon="i-lucide-plus"
                label="Ajouter"
                :disabled="!canAdd"
                :loading="isAdding"
                @click="addGoal"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton color="neutral" variant="ghost" label="Fermer" @click="close" />
      </div>
    </template>
  </UModal>
</template>
