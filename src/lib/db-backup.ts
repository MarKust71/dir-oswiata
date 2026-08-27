import 'server-only'
import * as z from 'zod'

import { prisma } from '@/lib/prisma'
import { AccountStatus, Role } from '@/generated/prisma/enums'

export const BACKUP_VERSION = 1

const roleSchema = z.enum([Role.ADMIN, Role.USER, Role.STUDENT])
const accountStatusSchema = z.enum([
  AccountStatus.PENDING_EMAIL,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.ACTIVE,
  AccountStatus.DISABLED,
])

const resultsRowSchema = z.object({
  id: z.string(),
  practicalScore: z.number().int(),
  theoryScore: z.number().int(),
  finalScore: z.number().int(),
  oralScore: z.number().int(),
  writtenScore: z.number().int(),
  profession: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  pesel: z.string(),
  applicationNumber: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const settingsRowSchema = z.object({
  key: z.string(),
  value: z.string(),
})

const userRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  role: roleSchema,
  status: accountStatusSchema,
  emailVerifiedAt: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  peselPositions: z.array(z.number().int()),
  peselDigits: z.array(z.string()),
  resultId: z.string().nullable(),
  applicationNumberAttempts: z.number().int(),
  resultsViewCount: z.number().int(),
  missingResultNotifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const verificationTokenRowSchema = z.object({
  id: z.string(),
  token: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
})

export const databaseBackupSchema = z.object({
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  tables: z.object({
    results: z.array(resultsRowSchema),
    settings: z.array(settingsRowSchema),
    user: z.array(userRowSchema),
    verificationToken: z.array(verificationTokenRowSchema),
  }),
})

export type DatabaseBackup = z.infer<typeof databaseBackupSchema>

/**
 * Eksportuje zawartość wszystkich tabel do jednej struktury JSON, gotowej do
 * zapisania jako plik kopii zapasowej i późniejszego odtworzenia przez
 * restoreDatabaseBackup(). Daty zapisywane są jako ISO-8601 (UTC), żeby plik
 * był zwykłym, przenośnym JSON-em.
 */
export async function createDatabaseBackup(): Promise<DatabaseBackup> {
  const [results, settings, user, verificationToken] = await Promise.all([
    prisma.results.findMany({ orderBy: { id: 'asc' } }),
    prisma.settings.findMany({ orderBy: { key: 'asc' } }),
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.verificationToken.findMany({ orderBy: { id: 'asc' } }),
  ])

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      results: results.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      settings,
      user: user.map((row) => ({
        ...row,
        emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
        missingResultNotifiedAt:
          row.missingResultNotifiedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      verificationToken: verificationToken.map((row) => ({
        ...row,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      })),
    },
  }
}

/**
 * Zastępuje całą zawartość wszystkich tabel danymi z kopii zapasowej - najpierw
 * czyści tabele w kolejności odwrotnej do zależności kluczy obcych
 * (VerificationToken -> User -> Results -> Settings), a następnie wstawia dane
 * z powrotem w kolejności zgodnej z tymi zależnościami. Całość w jednej
 * transakcji, żeby przy błędzie baza nie została w połowie wyczyszczona.
 */
export async function restoreDatabaseBackup(backup: DatabaseBackup) {
  const { results, settings, user, verificationToken } = backup.tables

  await prisma.$transaction([
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.results.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.results.createMany({
      data: results.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })),
    }),
    prisma.settings.createMany({ data: settings }),
    prisma.user.createMany({
      data: user.map((row) => ({
        ...row,
        emailVerifiedAt: row.emailVerifiedAt
          ? new Date(row.emailVerifiedAt)
          : null,
        missingResultNotifiedAt: row.missingResultNotifiedAt
          ? new Date(row.missingResultNotifiedAt)
          : null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })),
    }),
    prisma.verificationToken.createMany({
      data: verificationToken.map((row) => ({
        ...row,
        expiresAt: new Date(row.expiresAt),
        createdAt: new Date(row.createdAt),
      })),
    }),
  ])

  return {
    resultsCount: results.length,
    settingsCount: settings.length,
    userCount: user.length,
    verificationTokenCount: verificationToken.length,
  }
}
