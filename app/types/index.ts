export type Person = 'thomas' | 'emma'
export type BankFormat = 'credit-agricole' | 'boursorama' | 'unknown'
export type TransactionDirection = 'debit' | 'credit'

export type Category = string

export interface CategoryMeta {
  key: string
  label: string
  icon: string
  color: string
  scope?: 'commun' | Person
  goalId?: string
}

export interface Goal {
  id: string
  label: string
  icon: string
  color: string
  targetAmount: number
  scope: 'commun' | Person
  categoryKey: string
  createdAt: string
}

export interface Transaction {
  id: string
  date: string // 'YYYY-MM-DD'
  label: string // cleaned label
  rawLabel: string
  amount: number // always positive
  direction: TransactionDirection
  category: Category // auto-detected
  person: Person
  bankFormat: BankFormat
  importId: string
  importedAt: string // ISO datetime
}

export interface ImportSession {
  id: string
  person: Person
  bankFormat: BankFormat
  fileName: string
  importedAt: string
  transactionCount: number
  periodFrom: string // 'YYYY-MM-DD'
  periodTo: string
}

export interface CategoryOverride {
  transactionId: string
  category: Category
}

export interface CategoryBudget {
  id: string // `${person}:${categoryKey}`
  person: Person
  categoryKey: string
  amount: number // budget mensuel en euros
}

export interface MonthlyTotal {
  yearMonth: string // 'YYYY-MM'
  debits: number
  credits: number
}
