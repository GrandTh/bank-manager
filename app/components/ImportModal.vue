<script setup lang="ts">
import { readFileAsText, parseCSV, detectFormat } from '~/utils/csv'
import { formatDate } from '~/utils/formatters'
import type { Person } from '~/types'

const store = useTransactionsStore()
const toast = useToast()
const collapsed = useNavCollapsed()

const person = ref<Person>('thomas')
const isDragging = ref(false)
const file = ref<File | null>(null)
const preview = ref<Awaited<ReturnType<typeof parseCSV>> | null>(null)
const error = ref<string | null>(null)
const isImporting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const personOptions: Array<{ label: string, value: Person }> = [
  { label: 'Thomas', value: 'thomas' },
  { label: 'Emma', value: 'emma' }
]

async function processFile(f: File) {
  file.value = f
  error.value = null
  preview.value = null

  try {
    const content = await readFileAsText(f, 'ISO-8859-1')
    const format = detectFormat(f.name, content)

    if (!format) {
      const contentUtf8 = await readFileAsText(f, 'UTF-8')
      const formatUtf8 = detectFormat(f.name, contentUtf8)
      if (!formatUtf8) {
        error.value = 'Format de banque non reconnu. Seul le Crédit Agricole est supporté pour l\'instant.'
        file.value = null
        return
      }
      preview.value = parseCSV(contentUtf8, f.name, person.value, formatUtf8)
    } else {
      preview.value = parseCSV(content, f.name, person.value, format)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de la lecture du fichier.'
    file.value = null
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const f = e.dataTransfer?.files[0]
  if (f) processFile(f)
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) processFile(f)
}

async function confirmImport(close: () => void) {
  if (!preview.value || !file.value) return
  isImporting.value = true
  try {
    const content = await readFileAsText(file.value, 'ISO-8859-1')
    const format = detectFormat(file.value.name, content) ?? 'credit-agricole'
    const result = parseCSV(content, file.value.name, person.value, format)

    await store.addImport(result.transactions, result.session)
    toast.add({
      title: 'Import réussi',
      description: `${result.session.transactionCount} transactions importées pour ${person.value === 'thomas' ? 'Thomas' : 'Emma'}.`,
      color: 'success'
    })
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import.'
  } finally {
    isImporting.value = false
  }
}

function resetState() {
  file.value = null
  preview.value = null
  error.value = null
  person.value = 'thomas'
}
</script>

<template>
  <UModal
    title="Importer des transactions"
    @after:leave="resetState"
  >
    <UButton
      :block="!collapsed"
      icon="i-lucide-upload"
      :label="collapsed ? undefined : 'Importer CSV'"
    />

    <template #body>
      <div class="space-y-4">
        <!-- Person selector -->
        <div>
          <p class="text-sm font-medium text-(--ui-text) mb-2">
            Pour qui ?
          </p>
          <div class="flex gap-2">
            <UButton
              v-for="opt in personOptions"
              :key="opt.value"
              :label="opt.label"
              :variant="person === opt.value ? 'solid' : 'outline'"
              :color="person === opt.value ? 'primary' : 'neutral'"
              icon="i-lucide-user"
              @click="person = opt.value"
            />
          </div>
        </div>

        <!-- Drop zone -->
        <div
          v-if="!preview"
          class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
          :class="isDragging ? 'border-primary bg-primary/5' : 'border-(--ui-border) hover:border-primary/50'"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
          @click="fileInput?.click()"
        >
          <UIcon
            name="i-lucide-upload-cloud"
            class="text-4xl text-(--ui-text-muted) mb-3"
          />
          <p class="text-sm font-medium text-(--ui-text)">
            Déposer le fichier CSV ici
          </p>
          <p class="text-xs text-(--ui-text-muted) mt-1">
            ou cliquer pour parcourir
          </p>
          <p class="text-xs text-(--ui-text-muted) mt-3 opacity-60">
            Crédit Agricole · ISO-8859-1
          </p>
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="hidden"
            @change="onFileChange"
          >
        </div>

        <!-- Error -->
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          :description="error"
        />

        <!-- Preview -->
        <div v-if="preview">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-semibold text-(--ui-text)">
                {{ preview.session.fileName }}
              </p>
              <p class="text-xs text-(--ui-text-muted)">
                {{ formatDate(preview.session.periodFrom) }} → {{ formatDate(preview.session.periodTo) }}
                · {{ preview.session.transactionCount }} transactions
              </p>
            </div>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="file = null; preview = null"
            />
          </div>

          <div class="border border-(--ui-border) rounded-lg overflow-hidden">
            <div class="max-h-52 overflow-y-auto">
              <table class="w-full text-xs">
                <thead class="bg-(--ui-bg-elevated) sticky top-0">
                  <tr>
                    <th class="text-left px-3 py-2 text-(--ui-text-muted) font-medium">
                      Date
                    </th>
                    <th class="text-left px-3 py-2 text-(--ui-text-muted) font-medium">
                      Libellé
                    </th>
                    <th class="text-right px-3 py-2 text-(--ui-text-muted) font-medium">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="tx in preview.transactions.slice(0, 20)"
                    :key="tx.id"
                    class="border-t border-(--ui-border)"
                  >
                    <td class="px-3 py-1.5 text-(--ui-text-muted) tabular-nums whitespace-nowrap">
                      {{ formatDate(tx.date) }}
                    </td>
                    <td class="px-3 py-1.5 text-(--ui-text) max-w-xs truncate">
                      {{ tx.label }}
                    </td>
                    <td
                      class="px-3 py-1.5 text-right tabular-nums font-medium whitespace-nowrap"
                      :class="tx.direction === 'credit' ? 'text-emerald-500' : 'text-rose-500'"
                    >
                      {{ tx.direction === 'credit' ? '+' : '-' }}{{ tx.amount.toFixed(2) }} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p
              v-if="preview.transactions.length > 20"
              class="text-xs text-(--ui-text-muted) text-center py-2 border-t border-(--ui-border)"
            >
              ... et {{ preview.transactions.length - 20 }} autres
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Annuler"
          @click="close"
        />
        <UButton
          v-if="preview"
          :loading="isImporting"
          icon="i-lucide-check"
          :label="`Importer ${preview.session.transactionCount} transactions`"
          @click="confirmImport(close)"
        />
      </div>
    </template>
  </UModal>
</template>
