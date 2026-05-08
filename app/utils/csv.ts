import type { Transaction, ImportSession, Person, BankFormat } from '~/types'
import { autoCategory } from '~/utils/categorizer'

interface RawTransaction {
  date: string // 'YYYY-MM-DD'
  label: string
  rawLabel: string
  amount: number
  direction: 'debit' | 'credit'
}

// Deterministic ID: collision-safe enough for banking data
function makeId(person: string, date: string, direction: string, amount: number, label: string): string {
  const raw = `${person}|${date}|${direction}|${amount}|${label}`
  let h = 0x811c9dc5
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + '_' + raw.length.toString(36)
}

function parseAmount(str: string | undefined): number {
  if (!str || !str.trim()) return 0
  return parseFloat(str.trim().replace(/\s/g, '').replace(',', '.')) || 0
}

function isoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function cleanLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

// Minimal CSV parser that handles multiline quoted fields with ; delimiter
function parseCSVRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ';') {
        row.push(field)
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        if (row.some(f => f.trim())) rows.push(row)
        row = []
      } else if (ch !== '\r') {
        field += ch
      }
    }
  }
  if (field || row.length) {
    row.push(field)
    if (row.some(f => f.trim())) rows.push(row)
  }

  return rows
}

function parseCreditAgricole(content: string): RawTransaction[] {
  const rows = parseCSVRows(content)
  const headerIdx = rows.findIndex(r => r[0]?.trim() === 'Date')
  if (headerIdx === -1) throw new Error('Format CSV Crédit Agricole non reconnu — ligne "Date" introuvable.')

  return rows.slice(headerIdx + 1).flatMap((r) => {
    const dateRaw = r[0]?.trim()
    if (!dateRaw || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) return []

    const rawLabel = r[1] ?? ''
    const label = cleanLabel(rawLabel)
    const debit = parseAmount(r[2])
    const credit = parseAmount(r[3])
    if (debit === 0 && credit === 0) return []

    const direction = debit > 0 ? 'debit' as const : 'credit' as const
    return [{ date: isoDate(dateRaw), label, rawLabel: cleanLabel(rawLabel), amount: debit > 0 ? debit : credit, direction }]
  })
}

export type SupportedFormat = 'credit-agricole'

export function detectFormat(fileName: string, content: string): SupportedFormat | null {
  if (content.includes('Crédit Agricole') || content.includes('Credit Agricole') || content.includes('Compte de D')) {
    return 'credit-agricole'
  }
  return null
}

export interface ParseResult {
  transactions: Transaction[]
  session: ImportSession
}

export function parseCSV(
  content: string,
  fileName: string,
  person: Person,
  format: SupportedFormat
): ParseResult {
  let raw: RawTransaction[]

  if (format === 'credit-agricole') {
    raw = parseCreditAgricole(content)
  } else {
    throw new Error(`Format "${format}" non supporté.`)
  }

  const importId = crypto.randomUUID()
  const now = new Date().toISOString()

  const transactions: Transaction[] = raw.map(r => ({
    id: makeId(person, r.date, r.direction, r.amount, r.label),
    date: r.date,
    label: r.label,
    rawLabel: r.rawLabel,
    amount: r.amount,
    direction: r.direction,
    category: autoCategory(r.label, r.direction),
    person,
    bankFormat: format as BankFormat,
    importId,
    importedAt: now
  }))

  const dates = raw.map(r => r.date).sort()
  const today = now.substring(0, 10)
  const session: ImportSession = {
    id: importId,
    person,
    bankFormat: format as BankFormat,
    fileName,
    importedAt: now,
    transactionCount: transactions.length,
    periodFrom: dates.at(0) ?? today,
    periodTo: dates.at(-1) ?? today
  }

  return { transactions, session }
}

export function readFileAsText(file: File, encoding = 'ISO-8859-1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, encoding)
  })
}
