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
  content = content.replace(/^\uFEFF/, '')
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

// Colonnes Boursorama : "Solde" apparait deux fois — l'index 6 est le montant
// signe de l'operation, l'index 10 le solde du compte apres operation.
const BOURSORAMA_DATE = 0
const BOURSORAMA_LABEL = 2
const BOURSORAMA_SUGGESTED = 3
const BOURSORAMA_AMOUNT = 6

function parseBoursorama(content: string): RawTransaction[] {
  const rows = parseCSVRows(content)
  const headerIdx = rows.findIndex(r => r[BOURSORAMA_DATE]?.trim().startsWith('Date Op'))
  if (headerIdx === -1) throw new Error('Format CSV Boursorama non reconnu \u2014 ligne "Date Op\u00e9ration" introuvable.')

  return rows.slice(headerIdx + 1).flatMap((r) => {
    const date = r[BOURSORAMA_DATE]?.trim()
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []

    const amount = parseAmount(r[BOURSORAMA_AMOUNT])
    if (amount === 0) return []

    const rawLabel = cleanLabel(r[BOURSORAMA_LABEL] ?? '')
    const suggested = cleanLabel(r[BOURSORAMA_SUGGESTED] ?? '')

    return [{
      date,
      label: suggested || rawLabel,
      rawLabel,
      amount: Math.abs(amount),
      direction: amount < 0 ? 'debit' as const : 'credit' as const
    }]
  })
}

export type SupportedFormat = 'credit-agricole' | 'boursorama'

const FORMAT_ENCODING: Record<SupportedFormat, string> = {
  'credit-agricole': 'ISO-8859-1',
  'boursorama': 'UTF-8'
}

export function detectFormat(fileName: string, content: string): SupportedFormat | null {
  if (content.includes('Date Valeur') && content.includes('Pointage')) {
    return 'boursorama'
  }
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
  } else if (format === 'boursorama') {
    raw = parseBoursorama(content)
  } else {
    throw new Error(`Format "${format}" non supporté.`)
  }

  const importId = crypto.randomUUID()
  const now = new Date().toISOString()

  // Une banque peut exporter plusieurs operations strictement identiques le meme
  // jour (deux places de cinema, deux cafes). Le hash seul les confondrait et
  // addImport en supprimerait une : on suffixe les occurrences suivantes. La
  // premiere garde son id d'origine, pour rester idempotent avec l'existant.
  const seen = new Map<string, number>()

  const transactions: Transaction[] = raw.map((r) => {
    const baseId = makeId(person, r.date, r.direction, r.amount, r.label)
    const occurrence = seen.get(baseId) ?? 0
    seen.set(baseId, occurrence + 1)

    // Le libelle brut de la banque porte plus de signal que le libelle nettoye
    // ("AVOIR ... Jow", "APPLE.COM/BILL") : on categorise dessus en priorite.
    const category = autoCategory(r.rawLabel, r.direction)

    return {
      id: occurrence === 0 ? baseId : `${baseId}#${occurrence}`,
      date: r.date,
      label: r.label,
      rawLabel: r.rawLabel,
      amount: r.amount,
      direction: r.direction,
      category: category === 'non-categorise' && r.label !== r.rawLabel
        ? autoCategory(r.label, r.direction)
        : category,
      person,
      bankFormat: format as BankFormat,
      importId,
      importedAt: now
    }
  })

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

export async function readAndDetect(file: File): Promise<{ content: string, format: SupportedFormat }> {
  const probe = await readFileAsText(file, 'ISO-8859-1')
  const format = detectFormat(file.name, probe)
  if (!format) throw new Error('Format de banque non reconnu. Formats supportés : Crédit Agricole, Boursorama.')

  const encoding = FORMAT_ENCODING[format]
  const content = encoding === 'ISO-8859-1' ? probe : await readFileAsText(file, encoding)
  return { content, format }
}

export function readFileAsText(file: File, encoding = 'ISO-8859-1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, encoding)
  })
}
