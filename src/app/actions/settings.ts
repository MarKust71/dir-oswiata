'use server'

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/dal'
import {
  setAwsSendLimits,
  setEventLogPageSize,
  setEventLogRetentionDays,
  setInactivityTimeoutSeconds,
  setInactivityTimeoutStudentsOnly,
  setMaintenanceMode,
  setNotificationEmails,
  setResultsLimits,
  setResultsVisibilityWindow,
  setSkipEmailVerification,
} from '@/lib/settings'
import { NotificationEmailSchema } from '@/lib/validation'
import { parseWarsawLocalDateTime } from '@/lib/warsaw-time'
import { getClientRequestInfo } from '@/lib/request-info'
import { logEvent } from '@/lib/event-log'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Prisma } from '@/generated/prisma/client'
import { EventType, Role } from '@/generated/prisma/enums'

export type SettingsActionState =
  { message?: string; error?: string } | undefined

async function logSettingsChange(
  actor: { email: string; id: string },
  message: string,
  metadata: Prisma.InputJsonValue
) {
  const { ip, userAgent } = await getClientRequestInfo()
  await logEvent({
    type: EventType.SETTINGS_CHANGED,
    message,
    actorEmail: actor.email,
    actorUserId: actor.id,
    ip,
    userAgent,
    metadata,
  })
}

export async function updateNotificationEmailsAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

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
    await logSettingsChange(
      actor,
      `Zmieniono listę adresów do powiadomień (${actor.email}).`,
      { setting: 'notification_emails', emails }
    )
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
    const actor = await requireRole([Role.ADMIN])

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
    await logSettingsChange(
      actor,
      `Zmieniono okres udostępnienia wyników (${actor.email}).`,
      {
        setting: 'results_window',
        from: from.toISOString(),
        until: until.toISOString(),
      }
    )
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

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  const parsed = Number(String(value ?? '').trim())

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function updateResultsLimitsAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

    const maxApplicationNumberAttempts = parsePositiveInt(
      formData.get('maxApplicationNumberAttempts')
    )
    const maxResultsViewCount = parsePositiveInt(
      formData.get('maxResultsViewCount')
    )

    if (maxApplicationNumberAttempts === null || maxResultsViewCount === null) {
      return { error: 'Podaj dodatnie liczby całkowite dla obu limitów.' }
    }

    await setResultsLimits(maxApplicationNumberAttempts, maxResultsViewCount)
    await logSettingsChange(
      actor,
      `Zmieniono limity weryfikacji numeru wniosku (${actor.email}).`,
      {
        setting: 'results_limits',
        maxApplicationNumberAttempts,
        maxResultsViewCount,
      }
    )
    revalidatePath('/settings')

    return { message: 'Zapisano limity.' }
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

export async function updateMaintenanceModeAction(
  enabled: boolean
): Promise<{ error?: string }> {
  try {
    const actor = await requireRole([Role.ADMIN])

    await setMaintenanceMode(enabled)
    await logSettingsChange(
      actor,
      `Przełącznik przerwy konserwacyjnej ustawiony na ${enabled} przez ${actor.email}.`,
      { setting: 'maintenance_mode', enabled }
    )
    revalidatePath('/settings')
    revalidatePath('/login')
    revalidatePath('/')

    return {}
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

export async function updateSkipEmailVerificationAction(
  enabled: boolean
): Promise<{ error?: string }> {
  try {
    const actor = await requireRole([Role.ADMIN])

    await setSkipEmailVerification(enabled)
    await logSettingsChange(
      actor,
      `Przełącznik pomijania weryfikacji e-mail ustawiony na ${enabled} przez ${actor.email}.`,
      { setting: 'skip_email_verification', enabled }
    )
    revalidatePath('/settings')

    return {}
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

export async function updateInactivityTimeoutAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

    const inactivityTimeoutSeconds = parsePositiveInt(
      formData.get('inactivityTimeoutSeconds')
    )

    if (inactivityTimeoutSeconds === null) {
      return { error: 'Podaj dodatnią liczbę całkowitą sekund.' }
    }

    await setInactivityTimeoutSeconds(inactivityTimeoutSeconds)
    await logSettingsChange(
      actor,
      `Zmieniono czas automatycznego wylogowania (${actor.email}).`,
      { setting: 'inactivity_timeout', inactivityTimeoutSeconds }
    )
    revalidatePath('/settings')

    return { message: 'Zapisano czas automatycznego wylogowania.' }
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

export async function updateInactivityTimeoutStudentsOnlyAction(
  enabled: boolean
): Promise<{ error?: string }> {
  try {
    const actor = await requireRole([Role.ADMIN])

    await setInactivityTimeoutStudentsOnly(enabled)
    await logSettingsChange(
      actor,
      `Przełącznik "Tylko studenci" dla automatycznego wylogowania ustawiony na ${enabled} przez ${actor.email}.`,
      { setting: 'inactivity_timeout_students_only', enabled }
    )
    revalidatePath('/settings')

    return {}
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

export async function updateEventLogRetentionAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

    const retentionDays = parsePositiveInt(formData.get('retentionDays'))

    if (retentionDays === null) {
      return { error: 'Podaj dodatnią liczbę całkowitą dni.' }
    }

    await setEventLogRetentionDays(retentionDays)
    await logSettingsChange(
      actor,
      `Zmieniono okres przechowywania dziennika zdarzeń (${actor.email}).`,
      { setting: 'event_log_retention_days', retentionDays }
    )
    revalidatePath('/settings')
    revalidatePath('/logs')

    return { message: 'Zapisano okres przechowywania dziennika zdarzeń.' }
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

export async function updateEventLogPageSizeAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

    const pageSize = parsePositiveInt(formData.get('pageSize'))

    if (pageSize === null) {
      return { error: 'Podaj dodatnią liczbę całkowitą rekordów.' }
    }

    await setEventLogPageSize(pageSize)
    await logSettingsChange(
      actor,
      `Zmieniono liczbę rekordów na stronie dziennika zdarzeń (${actor.email}).`,
      { setting: 'event_log_page_size', pageSize }
    )
    revalidatePath('/settings')
    revalidatePath('/logs')

    return { message: 'Zapisano liczbę rekordów na stronie dziennika zdarzeń.' }
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

export async function updateAwsSendLimitsAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const actor = await requireRole([Role.ADMIN])

    const dailySendLimit = parsePositiveInt(formData.get('dailySendLimit'))
    const maxSendRatePerSecond = parsePositiveInt(
      formData.get('maxSendRatePerSecond')
    )

    if (dailySendLimit === null || maxSendRatePerSecond === null) {
      return { error: 'Podaj dodatnie liczby całkowite dla obu limitów.' }
    }

    await setAwsSendLimits(dailySendLimit, maxSendRatePerSecond)
    await logSettingsChange(
      actor,
      `Zmieniono limity wysyłki AWS SES (${actor.email}).`,
      { setting: 'aws_send_limits', dailySendLimit, maxSendRatePerSecond }
    )
    revalidatePath('/settings')

    return { message: 'Zapisano limity wysyłki AWS SES.' }
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
