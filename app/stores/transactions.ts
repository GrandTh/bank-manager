import { loadAll, saveImport, saveCategoryOverride, deleteImport, saveCustomCategory, deleteCustomCategory, saveBudget, deleteBudget, saveGoal, deleteGoal } from '~/utils/db'
import { CATEGORIES, CATEGORY_MAP } from '~/utils/categories'
import type { Transaction, ImportSession, Category, CategoryMeta, CategoryBudget, Goal, Person } from '~/types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const imports = ref<ImportSession[]>([])
  const overrides = ref<Record<string, Category>>({})
  const customCategories = ref<CategoryMeta[]>([])
  const budgets = ref<CategoryBudget[]>([])
  const goals = ref<Goal[]>([])
  const isLoading = ref(false)

  const selectedYearMonth = ref<string | null>(null)

  const availableYearMonths = computed(() => {
    const s = new Set(transactions.value.map(t => t.date.substring(0, 7)))
    return Array.from(s).sort().reverse()
  })

  const currentYearMonth = computed(() =>
    selectedYearMonth.value ?? availableYearMonths.value[0] ?? null
  )

  const previousYearMonth = computed(() => {
    if (!currentYearMonth.value) return null
    const [year, month] = currentYearMonth.value.split('-').map(Number)
    if (!year || !month) return null
    const d = new Date(year, month - 2)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const allCategories = computed(() => [...CATEGORIES, ...customCategories.value])

  function categoriesFor(person: Person): CategoryMeta[] {
    return allCategories.value.filter(c =>
      !c.scope || c.scope === 'commun' || c.scope === person
    )
  }

  const categoryMap = computed<Record<string, CategoryMeta>>(() => ({
    ...CATEGORY_MAP,
    ...Object.fromEntries(customCategories.value.map(c => [c.key, c]))
  }))

  function effectiveCategory(tx: Transaction): Category {
    return overrides.value[tx.id] ?? tx.category
  }

  function filteredFor(person?: Person): Transaction[] {
    return transactions.value
      .filter((t) => {
        if (person && t.person !== person) return false
        if (currentYearMonth.value && t.date.substring(0, 7) !== currentYearMonth.value) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  function totalDebits(person?: Person): number {
    return filteredFor(person)
      .filter(t => t.direction === 'debit')
      .reduce((s, t) => s + t.amount, 0)
  }

  function totalCredits(person?: Person): number {
    return filteredFor(person)
      .filter(t => t.direction === 'credit')
      .reduce((s, t) => s + t.amount, 0)
  }

  function byCategory(person?: Person): Record<string, number> {
    const result: Record<string, number> = {}
    filteredFor(person)
      .filter(t => t.direction === 'debit')
      .forEach((t) => {
        const cat = effectiveCategory(t)
        result[cat] = (result[cat] ?? 0) + t.amount
      })
    return result
  }

  function totalsForMonth(person: Person | undefined, yearMonth: string): { debits: number, credits: number } {
    const txs = transactions.value.filter((t) => {
      if (person && t.person !== person) return false
      return t.date.substring(0, 7) === yearMonth
    })
    return {
      debits: txs.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0),
      credits: txs.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
    }
  }

  function monthlyTotals(person?: Person, months = 6): Array<{ yearMonth: string, debits: number, credits: number }> {
    const targetMonths = availableYearMonths.value.slice(0, months).reverse()
    return targetMonths.map((ym) => {
      const txs = transactions.value.filter((t) => {
        if (person && t.person !== person) return false
        return t.date.substring(0, 7) === ym
      })
      return {
        yearMonth: ym,
        debits: txs.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0),
        credits: txs.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
      }
    })
  }

  async function load() {
    isLoading.value = true
    try {
      const { transactions: txs, imports: imps, overrides: ovr, customCategories: cats, budgets: bud, goals: gls } = await loadAll()
      transactions.value = txs
      imports.value = imps
      overrides.value = Object.fromEntries(ovr.map(o => [o.transactionId, o.category]))
      customCategories.value = cats
      budgets.value = bud
      goals.value = gls
    } finally {
      isLoading.value = false
    }
  }

  async function addImport(newTransactions: Transaction[], session: ImportSession) {
    const existingIds = new Set(transactions.value.map(t => t.id))
    const fresh = newTransactions.filter(t => !existingIds.has(t.id))
    await saveImport(fresh, session)
    transactions.value.push(...fresh)
    imports.value.push(session)
  }

  async function setCategoryOverride(transactionId: string, category: Category) {
    await saveCategoryOverride({ transactionId, category })
    overrides.value[transactionId] = category
  }

  async function removeImport(importId: string) {
    const deletedIds = await deleteImport(importId)
    transactions.value = transactions.value.filter(t => t.importId !== importId)
    imports.value = imports.value.filter(i => i.id !== importId)
    const deletedSet = new Set(deletedIds)
    overrides.value = Object.fromEntries(
      Object.entries(overrides.value).filter(([id]) => !deletedSet.has(id))
    )
  }

  async function addCategory(cat: CategoryMeta) {
    await saveCustomCategory(cat)
    customCategories.value.push(cat)
  }

  async function removeCategory(key: string) {
    await deleteCustomCategory(key)
    customCategories.value = customCategories.value.filter(c => c.key !== key)
  }

  function totalForGoal(goal: Goal): number {
    const persons: Person[] = goal.scope === 'commun' ? ['thomas', 'emma'] : [goal.scope]
    return transactions.value
      .filter(t => persons.includes(t.person) && effectiveCategory(t) === goal.categoryKey)
      .reduce((s, t) => s + t.amount, 0)
  }

  async function addGoal(goal: Goal) {
    const cat: CategoryMeta = {
      key: goal.categoryKey,
      label: goal.label,
      icon: goal.icon,
      color: goal.color,
      scope: goal.scope,
      goalId: goal.id
    }
    await Promise.all([saveGoal(goal), saveCustomCategory(cat)])
    goals.value.push(goal)
    customCategories.value.push(cat)
  }

  async function removeGoal(id: string) {
    const goal = goals.value.find(g => g.id === id)
    if (!goal) return
    await Promise.all([deleteGoal(id), deleteCustomCategory(goal.categoryKey)])
    goals.value = goals.value.filter(g => g.id !== id)
    customCategories.value = customCategories.value.filter(c => c.key !== goal.categoryKey)
  }

  function budgetFor(person: Person, categoryKey: string): CategoryBudget | undefined {
    return budgets.value.find(b => b.person === person && b.categoryKey === categoryKey)
  }

  function budgetAlerts(person: Person): { warning: number, over: number } {
    const spent = byCategory(person)
    let warning = 0
    let over = 0
    budgets.value.filter(b => b.person === person).forEach((b) => {
      const pct = ((spent[b.categoryKey] ?? 0) / b.amount) * 100
      if (pct > 100) over++
      else if (pct >= 80) warning++
    })
    return { warning, over }
  }

  async function setBudget(person: Person, categoryKey: string, amount: number) {
    const id = `${person}:${categoryKey}`
    const budget: CategoryBudget = { id, person, categoryKey, amount }
    await saveBudget(budget)
    const idx = budgets.value.findIndex(b => b.id === id)
    if (idx >= 0) budgets.value[idx] = budget
    else budgets.value.push(budget)
  }

  async function removeBudget(person: Person, categoryKey: string) {
    const id = `${person}:${categoryKey}`
    await deleteBudget(id)
    budgets.value = budgets.value.filter(b => b.id !== id)
  }

  return {
    transactions,
    imports,
    overrides,
    customCategories,
    isLoading,
    selectedYearMonth,
    availableYearMonths,
    currentYearMonth,
    previousYearMonth,
    totalsForMonth,
    allCategories,
    categoryMap,
    effectiveCategory,
    filteredFor,
    totalDebits,
    totalCredits,
    byCategory,
    monthlyTotals,
    load,
    addImport,
    setCategoryOverride,
    removeImport,
    addCategory,
    removeCategory,
    budgets,
    budgetFor,
    budgetAlerts,
    setBudget,
    removeBudget,
    goals,
    totalForGoal,
    addGoal,
    removeGoal,
    categoriesFor
  }
})
