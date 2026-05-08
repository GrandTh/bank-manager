<script setup lang="ts">
import { TAILWIND_HEX } from '~/utils/categories'
import type { CategoryMeta } from '~/types'

const store = useTransactionsStore()
const toast = useToast()
const collapsed = useNavCollapsed()

const name = ref('')
const selectedIcon = ref('i-lucide-tag')
const selectedColor = ref('violet')
const isAdding = ref(false)
const deletingKey = ref<string | null>(null)

const COLOR_OPTIONS = Object.entries(TAILWIND_HEX).map(([name, hex]) => ({ name, hex }))

const ICON_OPTIONS = [
  { label: 'Étiquette', value: 'i-lucide-tag' },
  { label: 'Étoile', value: 'i-lucide-star' },
  { label: 'Cadeau', value: 'i-lucide-gift' },
  { label: 'Musique', value: 'i-lucide-music' },
  { label: 'Livre', value: 'i-lucide-book' },
  { label: 'Sport', value: 'i-lucide-dumbbell' },
  { label: 'Voyage', value: 'i-lucide-plane' },
  { label: 'Bébé', value: 'i-lucide-baby' },
  { label: 'Animal', value: 'i-lucide-paw-print' },
  { label: 'Jeux', value: 'i-lucide-gamepad-2' },
  { label: 'Café', value: 'i-lucide-coffee' },
  { label: 'Coiffeur', value: 'i-lucide-scissors' },
  { label: 'Bricolage', value: 'i-lucide-wrench' },
  { label: 'Formation', value: 'i-lucide-graduation-cap' },
  { label: 'Streaming', value: 'i-lucide-tv' },
  { label: 'Photo', value: 'i-lucide-camera' },
  { label: 'Énergie', value: 'i-lucide-zap' },
  { label: 'Fleurs', value: 'i-lucide-flower' },
  { label: 'Épargne', value: 'i-lucide-piggy-bank' },
  { label: 'Don', value: 'i-lucide-hand-heart' }
]

function toSlug(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'categorie'
}

const canAdd = computed(() => name.value.trim().length >= 2)

async function addCategory() {
  if (!canAdd.value) return
  const slug = toSlug(name.value.trim())
  const key = store.allCategories.some(c => c.key === slug)
    ? `${slug}-${Date.now()}`
    : slug

  const cat: CategoryMeta = {
    key,
    label: name.value.trim(),
    icon: selectedIcon.value,
    color: selectedColor.value
  }

  isAdding.value = true
  try {
    await store.addCategory(cat)
    toast.add({ title: 'Catégorie créée', color: 'success', duration: 2000 })
    name.value = ''
    selectedIcon.value = 'i-lucide-tag'
    selectedColor.value = 'violet'
  } finally {
    isAdding.value = false
  }
}

async function removeCategory(key: string) {
  deletingKey.value = key
  try {
    await store.removeCategory(key)
    toast.add({ title: 'Catégorie supprimée', color: 'success', duration: 2000 })
  } finally {
    deletingKey.value = null
  }
}
</script>

<template>
  <UModal title="Catégories personnalisées">
    <UButton
      :block="!collapsed"
      color="neutral"
      variant="ghost"
      icon="i-lucide-tag"
      :label="collapsed ? undefined : 'Catégories'"
    />

    <template #body>
      <div class="space-y-5">
        <!-- Existing custom categories -->
        <div v-if="store.customCategories.length">
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Mes catégories
          </p>
          <div class="space-y-1.5">
            <div
              v-for="cat in store.customCategories"
              :key="cat.key"
              class="flex items-center gap-3 px-3 py-2 rounded-lg border border-default"
            >
              <div
                class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                :style="{ background: (TAILWIND_HEX[cat.color] ?? '#6b7280') + '20', color: TAILWIND_HEX[cat.color] ?? '#6b7280' }"
              >
                <UIcon
                  :name="cat.icon"
                  class="text-sm"
                />
              </div>
              <span class="flex-1 text-sm text-default">{{ cat.label }}</span>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :loading="deletingKey === cat.key"
                @click="removeCategory(cat.key)"
              />
            </div>
          </div>
        </div>

        <!-- Add form -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Ajouter une catégorie
          </p>

          <div class="space-y-3">
            <UInput
              v-model="name"
              placeholder="Nom de la catégorie"
              icon="i-lucide-pencil"
              @keyup.enter="addCategory"
            />

            <!-- Icon picker -->
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

            <!-- Color picker -->
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

            <!-- Preview + Add -->
            <div class="flex items-center gap-3 pt-1">
              <div
                v-if="name.trim()"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :style="{
                  background: (TAILWIND_HEX[selectedColor] ?? '#6b7280') + '20',
                  color: TAILWIND_HEX[selectedColor] ?? '#6b7280'
                }"
              >
                <UIcon
                  :name="selectedIcon"
                  class="text-xs"
                />
                {{ name.trim() }}
              </div>
              <div class="flex-1" />
              <UButton
                icon="i-lucide-plus"
                label="Ajouter"
                :disabled="!canAdd"
                :loading="isAdding"
                @click="addCategory"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          label="Fermer"
          @click="close"
        />
      </div>
    </template>
  </UModal>
</template>
