'use server'

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/dal'
import {
  setNotificationEmails,
  setResultsVisibilityWindow,
} from '@/lib/settings'
import { NotificationEmailSchema } from '@/lib/validation'
import { parseWarsawLocalDateTime } from '@/lib/warsaw-time'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Role } from '@/generated/prisma/enums'

export type SettingsActionState =
  { message?: string; error?: string } | undefined

export async function updateNotificationEmailsAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireRole([Role.ADMIN])

    const candidates = String(formData.get('emails') ?? '')
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean)

    const emails: string[] = []
    for (const candidate of candidates) {
      const parsed = NotificationEmailSchema.safeParse(candidate)
      if (!parsed.success) {
        return { error: `Nieprawidłowy adres e-mail: "${candidate}"` }
      }
      if (!emails.includes(parsed.data)) {
        emails.push(parsed.data)
      }
    }

    await setNotificationEmails(emails)
    revalidatePath('/settings')

    return { message: 'Zapisano listę adresów do powiadomień.' }
  } catch (error) {
    if (
      isDatabaseConnectionError(error) ||
      (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
    ) {
      return { error: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }
}

export async function updateResultsWindowAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireRole([Role.ADMIN])

    const from = parseWarsawLocalDateTime(String(formData.get('from') ?? ''))
    const until = parseWarsawLocalDateTime(String(formData.get('until') ?? ''))

    if (!from || !until) {
      return { error: 'Podaj poprawną datę i godzinę początku oraz końca.' }
    }
    if (from > until) {
      return {
        error: 'Data początkowa nie może być późniejsza niż data końcowa.',
      }
    }

    await setResultsVisibilityWindow(from, until)
    revalidatePath('/settings')
    revalidatePath('/panel')

    return { message: 'Zapisano okres udostępnienia wyników.' }
  } catch (error) {
    if (
      isDatabaseConnectionError(error) ||
      (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
    ) {
      return { error: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }
}
