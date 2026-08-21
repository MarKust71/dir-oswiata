import 'server-only'

import { Prisma } from '@/generated/prisma/client'

export { DB_CONNECTION_ERROR_MESSAGE } from '@/lib/db-error-message'

// Kody błędów Prisma odpowiadające awarii połączenia z bazą (a nie błędom
// w zapytaniu), zob. https://www.prisma.io/docs/orm/reference/error-reference
const PRISMA_CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017'])

// Ten projekt używa driver adapter (@prisma/adapter-pg) - błąd braku połączenia
// z bazą trafia do aplikacji jako PrismaClientKnownRequestError, którego `code`
// jest surowym kodem błędu sieciowego node/pg, a nie kodem Prisma (zweryfikowane
// eksperymentalnie: zerwane połączenie daje `code: 'ECONNREFUSED'`).
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ECONNRESET',
])

export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true

  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (PRISMA_CONNECTION_ERROR_CODES.has(error.code) ||
      NETWORK_ERROR_CODES.has(error.code))
  )
}
