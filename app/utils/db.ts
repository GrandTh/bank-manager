import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Transaction, ImportSession, CategoryOverride, CategoryMeta, CategoryBudget, Goal } from '~/types'

interface BankDB extends DBSchema {
  'transactions': {
    key: string
    value: Transaction
    indexes: {
      'by-person': string
      'by-import': string
      'by-date': string
    }
  }
  'imports': {
    key: string
    value: ImportSession
  }
  'category-overrides': {
    key: string
    value: CategoryOverride
  }
  'custom-categories': {
    key: string
    value: CategoryMeta
  }
  'category-budgets': {
    key: string
    value: CategoryBudget
  }
  'goals': {
    key: string
    value: Goal
  }
}

let db: IDBPDatabase<BankDB> | null = null

export async function getDB(): Promise<IDBPDatabase<BankDB>> {
  if (db) return db

  db = await openDB<BankDB>('bank-manager', 4, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const txStore = database.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('by-person', 'person')
        txStore.createIndex('by-import', 'importId')
        txStore.createIndex('by-date', 'date')
        database.createObjectStore('imports', { keyPath: 'id' })
        database.createObjectStore('category-overrides', { keyPath: 'transactionId' })
      }
      if (oldVersion < 2) {
        database.createObjectStore('custom-categories', { keyPath: 'key' })
      }
      if (oldVersion < 3) {
        database.createObjectStore('category-budgets', { keyPath: 'id' })
      }
      if (oldVersion < 4) {
        database.createObjectStore('goals', { keyPath: 'id' })
      }
    }
  })

  return db
}

export async function loadAll() {
  const database = await getDB()
  const [transactions, imports, overrides, customCategories, budgets, goals] = await Promise.all([
    database.getAll('transactions'),
    database.getAll('imports'),
    database.getAll('category-overrides'),
    database.getAll('custom-categories'),
    database.getAll('category-budgets'),
    database.getAll('goals')
  ])
  return { transactions, imports, overrides, customCategories, budgets, goals }
}

export async function saveGoal(goal: Goal) {
  const database = await getDB()
  await database.put('goals', goal)
}

export async function deleteGoal(id: string) {
  const database = await getDB()
  await database.delete('goals', id)
}

export async function saveBudget(budget: CategoryBudget) {
  const database = await getDB()
  await database.put('category-budgets', budget)
}

export async function deleteBudget(id: string) {
  const database = await getDB()
  await database.delete('category-budgets', id)
}

export async function saveImport(transactions: Transaction[], session: ImportSession) {
  const database = await getDB()
  const tx = database.transaction(['transactions', 'imports'], 'readwrite')
  await Promise.all([
    ...transactions.map(t => tx.objectStore('transactions').put(t)),
    tx.objectStore('imports').put(session)
  ])
  await tx.done
}

export async function saveCategoryOverride(override: CategoryOverride) {
  const database = await getDB()
  await database.put('category-overrides', override)
}

export async function deleteImport(importId: string) {
  const database = await getDB()
  const toDelete = await database.getAllFromIndex('transactions', 'by-import', importId)

  const tx = database.transaction(['transactions', 'imports', 'category-overrides'], 'readwrite')
  await Promise.all([
    ...toDelete.map(t => tx.objectStore('transactions').delete(t.id)),
    ...toDelete.map(t => tx.objectStore('category-overrides').delete(t.id)),
    tx.objectStore('imports').delete(importId)
  ])
  await tx.done

  return toDelete.map(t => t.id)
}

export async function saveCustomCategory(category: CategoryMeta) {
  const database = await getDB()
  await database.put('custom-categories', category)
}

export async function deleteCustomCategory(key: string) {
  const database = await getDB()
  await database.delete('custom-categories', key)
}
