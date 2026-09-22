import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransactionsStore } from '~/stores/transactions'
import type { Transaction, ImportSession, Goal } from '~/types'

// Mock the db layer — store logic tested in isolation
vi.mock('~/utils/db', () => ({
  loadAll: vi.fn().mockResolvedValue({ transactions: [], imports: [], overrides: [], customCategories: [] }),
  saveImport: vi.fn().mockResolvedValue(undefined),
  saveCategoryOverride: vi.fn().mockResolvedValue(undefined),
  deleteImport: vi.fn().mockResolvedValue([]),
  saveCustomCategory: vi.fn().mockResolvedValue(undefined),
  deleteCustomCategory: vi.fn().mockResolvedValue(undefined)
}))

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2026-04-15',
    label: 'Test transaction',
    rawLabel: 'Test transaction',
    amount: 100,
    direction: 'debit',
    category: 'alimentation',
    person: 'thomas',
    bankFormat: 'credit-agricole',
    importId: 'import-1',
    importedAt: new Date().toISOString(),
    ...overrides
  }
}

function makeSession(overrides: Partial<ImportSession> = {}): ImportSession {
  return {
    id: 'import-1',
    person: 'thomas',
    bankFormat: 'credit-agricole',
    fileName: 'test.csv',
    importedAt: new Date().toISOString(),
    transactionCount: 1,
    periodFrom: '2026-04-01',
    periodTo: '2026-04-30',
    ...overrides
  }
}

describe('useTransactionsStore — filteredFor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('retourne toutes les transactions si pas de filtre personne', () => {
    const store = useTransactionsStore()
    store.transactions = [makeTx({ person: 'thomas' }), makeTx({ person: 'emma' })]
    store.selectedYearMonth = '2026-04'
    expect(store.filteredFor()).toHaveLength(2)
  })

  it('filtre par personne', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ person: 'thomas' }),
      makeTx({ person: 'emma' }),
      makeTx({ person: 'thomas' })
    ]
    store.selectedYearMonth = '2026-04'
    expect(store.filteredFor('thomas')).toHaveLength(2)
    expect(store.filteredFor('emma')).toHaveLength(1)
  })

  it('filtre par période (yearMonth)', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-10' }),
      makeTx({ date: '2026-03-15' }),
      makeTx({ date: '2026-04-28' })
    ]
    store.selectedYearMonth = '2026-04'
    expect(store.filteredFor()).toHaveLength(2)
  })

  it('trie par date décroissante', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-01' }),
      makeTx({ date: '2026-04-30' }),
      makeTx({ date: '2026-04-15' })
    ]
    store.selectedYearMonth = '2026-04'
    const dates = store.filteredFor().map(t => t.date)
    expect(dates).toEqual(['2026-04-30', '2026-04-15', '2026-04-01'])
  })
})

describe('useTransactionsStore — totalDebits / totalCredits', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calcule le total des débits', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-04'
    store.transactions = [
      makeTx({ amount: 50, direction: 'debit' }),
      makeTx({ amount: 30, direction: 'debit' }),
      makeTx({ amount: 200, direction: 'credit' })
    ]
    expect(store.totalDebits()).toBeCloseTo(80)
  })

  it('calcule le total des crédits', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-04'
    store.transactions = [
      makeTx({ amount: 50, direction: 'debit' }),
      makeTx({ amount: 1000, direction: 'credit' }),
      makeTx({ amount: 500, direction: 'credit' })
    ]
    expect(store.totalCredits()).toBeCloseTo(1500)
  })

  it('filtre par personne dans les totaux', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-04'
    store.transactions = [
      makeTx({ amount: 100, direction: 'debit', person: 'thomas' }),
      makeTx({ amount: 200, direction: 'debit', person: 'emma' })
    ]
    expect(store.totalDebits('thomas')).toBeCloseTo(100)
    expect(store.totalDebits('emma')).toBeCloseTo(200)
  })

  it('retourne 0 si aucune transaction', () => {
    const store = useTransactionsStore()
    expect(store.totalDebits()).toBe(0)
    expect(store.totalCredits()).toBe(0)
  })
})

describe('useTransactionsStore — byCategory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('regroupe les débits par catégorie', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-04'
    store.transactions = [
      makeTx({ amount: 50, category: 'alimentation' }),
      makeTx({ amount: 30, category: 'alimentation' }),
      makeTx({ amount: 25, category: 'transport' }),
      makeTx({ amount: 1000, direction: 'credit', category: 'revenus' })
    ]
    const cats = store.byCategory()
    expect(cats['alimentation']).toBeCloseTo(80)
    expect(cats['transport']).toBeCloseTo(25)
    expect(cats['revenus']).toBeUndefined() // crédits exclus
  })
})

describe('useTransactionsStore — effectiveCategory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('retourne la catégorie originale sans override', () => {
    const store = useTransactionsStore()
    const tx = makeTx({ category: 'alimentation' })
    expect(store.effectiveCategory(tx)).toBe('alimentation')
  })

  it('retourne l\'override si défini', () => {
    const store = useTransactionsStore()
    const tx = makeTx({ category: 'alimentation' })
    store.overrides[tx.id] = 'transport'
    expect(store.effectiveCategory(tx)).toBe('transport')
  })
})

describe('useTransactionsStore — availableYearMonths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('liste les mois disponibles en ordre décroissant', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-10' }),
      makeTx({ date: '2026-02-15' }),
      makeTx({ date: '2026-04-28' }),
      makeTx({ date: '2026-03-01' })
    ]
    expect(store.availableYearMonths).toEqual(['2026-04', '2026-03', '2026-02'])
  })

  it('déduplique les mois', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-10' }),
      makeTx({ date: '2026-04-15' }),
      makeTx({ date: '2026-04-28' })
    ]
    expect(store.availableYearMonths).toHaveLength(1)
  })
})

describe('useTransactionsStore — monthlyTotals', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('retourne les totaux par mois', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-10', amount: 100, direction: 'debit' }),
      makeTx({ date: '2026-04-15', amount: 500, direction: 'credit' }),
      makeTx({ date: '2026-03-20', amount: 200, direction: 'debit' })
    ]
    const totals = store.monthlyTotals(undefined, 6)
    const april = totals.find(t => t.yearMonth === '2026-04')
    const march = totals.find(t => t.yearMonth === '2026-03')
    expect(april?.debits).toBeCloseTo(100)
    expect(april?.credits).toBeCloseTo(500)
    expect(march?.debits).toBeCloseTo(200)
  })

  it('filtre par personne', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ date: '2026-04-10', amount: 100, person: 'thomas' }),
      makeTx({ date: '2026-04-10', amount: 200, person: 'emma' })
    ]
    const totals = store.monthlyTotals('thomas', 6)
    const april = totals.find(t => t.yearMonth === '2026-04')
    expect(april?.debits).toBeCloseTo(100)
  })
})

describe('useTransactionsStore — addImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ajoute les transactions et la session', async () => {
    const store = useTransactionsStore()
    const txs = [makeTx(), makeTx()]
    const session = makeSession({ transactionCount: 2 })
    await store.addImport(txs, session)
    expect(store.transactions).toHaveLength(2)
    expect(store.imports).toHaveLength(1)
  })

  it('déduplique les transactions déjà présentes', async () => {
    const store = useTransactionsStore()
    const tx = makeTx()
    store.transactions = [tx]
    await store.addImport([tx], makeSession())
    expect(store.transactions).toHaveLength(1)
  })
})

describe('useTransactionsStore — setCategoryOverride', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('met à jour l\'override en mémoire', async () => {
    const store = useTransactionsStore()
    const tx = makeTx({ category: 'alimentation' })
    await store.setCategoryOverride(tx.id, 'transport')
    expect(store.overrides[tx.id]).toBe('transport')
    expect(store.effectiveCategory(tx)).toBe('transport')
  })
})

describe('useTransactionsStore — addCategory / removeCategory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ajoute une catégorie personnalisée', async () => {
    const store = useTransactionsStore()
    await store.addCategory({ key: 'vacances', label: 'Vacances', icon: 'i-lucide-plane', color: 'sky' })
    expect(store.customCategories).toHaveLength(1)
    expect(store.customCategories[0].key).toBe('vacances')
  })

  it('allCategories inclut les catégories custom', async () => {
    const store = useTransactionsStore()
    const builtinCount = store.allCategories.length
    await store.addCategory({ key: 'vacances', label: 'Vacances', icon: 'i-lucide-plane', color: 'sky' })
    expect(store.allCategories).toHaveLength(builtinCount + 1)
  })

  it('categoryMap inclut les catégories custom', async () => {
    const store = useTransactionsStore()
    await store.addCategory({ key: 'vacances', label: 'Vacances', icon: 'i-lucide-plane', color: 'sky' })
    expect(store.categoryMap['vacances']).toBeDefined()
    expect(store.categoryMap['vacances'].label).toBe('Vacances')
  })

  it('supprime une catégorie personnalisée', async () => {
    const store = useTransactionsStore()
    await store.addCategory({ key: 'vacances', label: 'Vacances', icon: 'i-lucide-plane', color: 'sky' })
    await store.removeCategory('vacances')
    expect(store.customCategories).toHaveLength(0)
    expect(store.categoryMap['vacances']).toBeUndefined()
  })
})

describe('useTransactionsStore — previousYearMonth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('retourne null quand aucun mois courant', () => {
    const store = useTransactionsStore()
    expect(store.previousYearMonth).toBeNull()
  })

  it('retourne le mois précédent', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-04'
    expect(store.previousYearMonth).toBe('2026-03')
  })

  it('recule sur l\'année précédente en janvier', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-01'
    expect(store.previousYearMonth).toBe('2025-12')
  })

  it('conserve le zéro de tête sur les mois à un chiffre', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-10'
    expect(store.previousYearMonth).toBe('2026-09')
  })

  it('suit le mois courant déduit des transactions', () => {
    const store = useTransactionsStore()
    store.transactions = [makeTx({ date: '2026-03-10' }), makeTx({ date: '2026-05-10' })]
    expect(store.currentYearMonth).toBe('2026-05')
    expect(store.previousYearMonth).toBe('2026-04')
  })
})

describe('useTransactionsStore — totalForGoal', () => {
  const goal: Goal = {
    id: 'g1',
    label: 'Épargne',
    icon: 'i-lucide-piggy-bank',
    color: 'violet',
    targetAmount: 5000,
    scope: 'emma',
    categoryKey: 'goal-epargne',
    createdAt: '2026-01-01'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('retourne 0 quand aucune transaction n\'est rattachée', () => {
    const store = useTransactionsStore()
    store.goals = [goal]
    expect(store.totalForGoal(goal)).toBe(0)
  })

  it('additionne les versements vers l\'épargne', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 754 }),
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 150 })
    ]
    expect(store.totalForGoal(goal)).toBe(904)
  })

  it('soustrait les retraits d\'épargne', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 754 }),
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'credit', amount: 1500 })
    ]
    expect(store.totalForGoal(goal)).toBe(-746)
  })

  it('ignore les transactions d\'une autre personne', () => {
    const store = useTransactionsStore()
    store.transactions = [
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 754 }),
      makeTx({ person: 'thomas', category: 'goal-epargne', direction: 'debit', amount: 999 })
    ]
    expect(store.totalForGoal(goal)).toBe(754)
  })

  it('cumule les deux personnes sur un objectif commun', () => {
    const store = useTransactionsStore()
    const commun: Goal = { ...goal, scope: 'commun' }
    store.transactions = [
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 754 }),
      makeTx({ person: 'thomas', category: 'goal-epargne', direction: 'debit', amount: 246 })
    ]
    expect(store.totalForGoal(commun)).toBe(1000)
  })

  it('tient compte d\'une recatégorisation manuelle', () => {
    const store = useTransactionsStore()
    const tx = makeTx({ person: 'emma', category: 'alimentation', direction: 'debit', amount: 300 })
    store.transactions = [tx]
    expect(store.totalForGoal(goal)).toBe(0)
    store.overrides = { [tx.id]: 'goal-epargne' }
    expect(store.totalForGoal(goal)).toBe(300)
  })

  it('cumule toutes les périodes, pas seulement le mois sélectionné', () => {
    const store = useTransactionsStore()
    store.selectedYearMonth = '2026-08'
    store.transactions = [
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 400, date: '2026-08-10' }),
      makeTx({ person: 'emma', category: 'goal-epargne', direction: 'debit', amount: 600, date: '2026-03-10' })
    ]
    expect(store.totalForGoal(goal)).toBe(1000)
  })
})
