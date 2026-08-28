'use server'

import { revalidatePath } from 'next/cache'
import ExcelJS from 'exceljs'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { relinkAllStudentsToResults } from '@/lib/results-matching'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Role } from '@/generated/prisma/enums'

export type ImportResultsActionState =
  { message?: string; error?: string } | undefined

export type RelinkResultsActionState =
  { message?: string; error?: string } | undefined

export async function relinkResultsAction(
  _state: RelinkResultsActionState,
  _formData: FormData
): Promise<RelinkResultsActionState> {
  try {
    await requireRole([Role.ADMIN])

    const { linkedCount, unlinkedCount, unchangedCount } =
      await relinkAllStudentsToResults()

    revalidatePath('/settings')
    revalidatePath('/panel')
    revalidatePath('/dashboard')

    return {
      message: `Zakończono. Nowo powiązane: ${linkedCount}, rozłączone (niepasujące): ${unlinkedCount}, niezmienione poprawne powiązania: ${unchangedCount}.`,
    }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}

type NewResultRow = {
  practicalScore: number
  theoryScore: number
  finalScore: number
  oralScore: number
  writtenScore: number
  profession: string
  firstName: string
  lastName: string
  pesel: string
  applicationNumber: string
}

// Nagłówki oczekiwane w pierwszym wierszu arkusza - dokładnie takie, jak w
// pliku eksportowanym z systemu egzaminacyjnego - zmapowane na pola modelu Results.
const COLUMN_MAP: Record<string, keyof NewResultRow> = {
  Praktyka: 'practicalScore',
  Teoria: 'theoryScore',
  Końcowa: 'finalScore',
  'Ocena ustna': 'oralScore',
  'Ocena pisemna': 'writtenScore',
  zawód: 'profession',
  Imię: 'firstName',
  Nazwisko: 'lastName',
  Pesel: 'pesel',
  'Nr wniosku': 'applicationNumber',
}

const NUMERIC_FIELDS = new Set<keyof NewResultRow>([
  'practicalScore',
  'theoryScore',
  'finalScore',
  'oralScore',
  'writtenScore',
])

function toDbConnectionErrorState(error: unknown) {
  if (
    isDatabaseConnectionError(error) ||
    (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
  ) {
    return { error: DB_CONNECTION_ERROR_MESSAGE }
  }

  return null
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('')
    }
    if ('text' in value) return String(value.text)
    if ('result' in value) return cellText(value.result ?? null)

    return ''
  }

  return String(value).trim()
}

export async function importResultsAction(
  _state: ImportResultsActionState,
  formData: FormData
): Promise<ImportResultsActionState> {
  try {
    await requireRole([Role.ADMIN])

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Wybierz plik .xlsx do zaimportowania.' }
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return { error: 'Obsługiwany jest tylko format .xlsx.' }
    }

    const workbook = new ExcelJS.Workbook()
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      // exceljs ships a broken ambient `declare interface Buffer extends ArrayBuffer {}`
      // that, merged with @types/node's Buffer under lib "esnext", makes no real
      // Buffer value satisfiable at the type level - this cast is safe at runtime.
      // @ts-expect-error see comment above
      await workbook.xlsx.load(buffer)
    } catch {
      return {
        error: 'Nie udało się odczytać pliku. Sprawdź, czy to plik .xlsx.',
      }
    }

    const sheet = workbook.worksheets[0]
    if (!sheet) {
      return { error: 'Plik nie zawiera żadnego arkusza.' }
    }

    const columnIndexToField = new Map<number, keyof NewResultRow>()
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const field = COLUMN_MAP[cellText(cell.value)]
      if (field) columnIndexToField.set(colNumber, field)
    })

    const foundFields = new Set(columnIndexToField.values())
    const missingHeaders = Object.entries(COLUMN_MAP)
      .filter(([, field]) => !foundFields.has(field))
      .map(([header]) => header)
    if (missingHeaders.length > 0) {
      return {
        error: `W pliku brakuje wymaganych kolumn: ${missingHeaders.join(', ')}.`,
      }
    }

    const rows: NewResultRow[] = []
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      if (row.actualCellCount === 0) continue

      const record: Record<string, string | number> = {}
      for (const [colNumber, field] of columnIndexToField) {
        const text = cellText(row.getCell(colNumber).value)

        if (NUMERIC_FIELDS.has(field)) {
          const num = Number(text)
          if (text === '' || Number.isNaN(num)) {
            return {
              error: `Nieprawidłowa wartość liczbowa w wierszu ${rowNumber}.`,
            }
          }
          record[field] = num
        } else {
          if (text === '') {
            return {
              error: `Brak wymaganej wartości w wierszu ${rowNumber}.`,
            }
          }
          record[field] = text
        }
      }

      rows.push(record as unknown as NewResultRow)
    }

    if (rows.length === 0) {
      return { error: 'Plik nie zawiera żadnych wierszy z danymi.' }
    }

    // Import zastępuje poprzednie dane, a nie je uzupełnia - zgoda na to jest
    // egzekwowana po stronie klienta (okno potwierdzenia przed wysłaniem formularza).
    await prisma.$transaction([
      prisma.results.deleteMany(),
      prisma.results.createMany({ data: rows }),
    ])

    // Wszystkie poprzednie powiązania zostały już wyzerowane kaskadowo przez
    // ON DELETE SET NULL (import usuwa wszystkie stare rekordy Results), więc
    // liczą się tylko nowe powiązania.
    const { linkedCount } = await relinkAllStudentsToResults()

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return {
      message: `Usunięto poprzednie dane i zaimportowano ${rows.length} wierszy. Powiązano ${linkedCount} kont uczniów z wynikami.`,
    }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}
