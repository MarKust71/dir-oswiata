'use server'

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/dal'
import {
  BACKUP_VERSION,
  databaseBackupSchema,
  restoreDatabaseBackup,
} from '@/lib/db-backup'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Role } from '@/generated/prisma/enums'

export type RestoreBackupActionState =
  { message?: string; error?: string } | undefined

function toDbConnectionErrorState(error: unknown) {
  if (
    isDatabaseConnectionError(error) ||
    (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
  ) {
    return { error: DB_CONNECTION_ERROR_MESSAGE }
  }

  return null
}

export async function restoreBackupAction(
  _state: RestoreBackupActionState,
  formData: FormData
): Promise<RestoreBackupActionState> {
  try {
    await requireRole([Role.ADMIN])

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Wybierz plik kopii zapasowej (.json) do wczytania.' }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      return {
        error:
          'Nie udało się odczytać pliku. To nie jest prawidłowy plik JSON.',
      }
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== BACKUP_VERSION
    ) {
      return {
        error: `Plik nie jest zgodną kopią zapasową (oczekiwana wersja formatu: ${BACKUP_VERSION}).`,
      }
    }

    const result = databaseBackupSchema.safeParse(parsed)
    if (!result.success) {
      return { error: 'Plik kopii zapasowej ma nieprawidłową strukturę.' }
    }

    const counts = await restoreDatabaseBackup(result.data)

    revalidatePath('/dashboard')
    revalidatePath('/settings')
    revalidatePath('/panel')
    revalidatePath('/results')

    return {
      message: `Przywrócono kopię zapasową: ${counts.userCount} kont, ${counts.resultsCount} wyników, ${counts.settingsCount} ustawień, ${counts.verificationTokenCount} tokenów weryfikacyjnych.`,
    }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}
