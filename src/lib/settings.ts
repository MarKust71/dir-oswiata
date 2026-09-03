import 'server-only'

import { prisma } from '@/lib/prisma'
import { toWarsawOffsetISOString } from '@/lib/warsaw-time'

export const NOTIFICATION_EMAILS_KEY = 'emails_for_notifications'

// Granice okresu (data i godzina czasu lokalnego), w którym studenci będą mogli
// zobaczyć swoje wyniki egzaminu - zob. src/app/panel/page.tsx.
export const RESULTS_VISIBLE_FROM_KEY = 'results_visible_from'
export const RESULTS_VISIBLE_UNTIL_KEY = 'results_visible_until'

async function getSettingDate(key: string): Promise<Date | null> {
  const row = await prisma.settings.findUnique({ where: { key } })
  if (!row) return null

  const date = new Date(row.value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getResultsVisibleFrom() {
  return getSettingDate(RESULTS_VISIBLE_FROM_KEY)
}

export function getResultsVisibleUntil() {
  return getSettingDate(RESULTS_VISIBLE_UNTIL_KEY)
}

export async function setResultsVisibilityWindow(from: Date, until: Date) {
  const fromValue = toWarsawOffsetISOString(from)
  const untilValue = toWarsawOffsetISOString(until)

  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: RESULTS_VISIBLE_FROM_KEY },
      create: { key: RESULTS_VISIBLE_FROM_KEY, value: fromValue },
      update: { value: fromValue },
    }),
    prisma.settings.upsert({
      where: { key: RESULTS_VISIBLE_UNTIL_KEY },
      create: { key: RESULTS_VISIBLE_UNTIL_KEY, value: untilValue },
      update: { value: untilValue },
    }),
  ])
}

// Limity dotyczące weryfikacji numeru wniosku i wyświetlania wyników przez
// studenta - zob. src/app/actions/verify-application-number.ts.
export const MAX_APPLICATION_NUMBER_ATTEMPTS_KEY =
  'max_application_number_attempts'
export const MAX_RESULTS_VIEW_COUNT_KEY = 'max_results_view_count'

const DEFAULT_MAX_APPLICATION_NUMBER_ATTEMPTS = 3
const DEFAULT_MAX_RESULTS_VIEW_COUNT = 3

async function getSettingPositiveInt(
  key: string,
  fallback: number
): Promise<number> {
  const row = await prisma.settings.findUnique({ where: { key } })
  if (!row) return fallback

  const value = Number(row.value)

  return Number.isInteger(value) && value > 0 ? value : fallback
}

export function getMaxApplicationNumberAttempts() {
  return getSettingPositiveInt(
    MAX_APPLICATION_NUMBER_ATTEMPTS_KEY,
    DEFAULT_MAX_APPLICATION_NUMBER_ATTEMPTS
  )
}

export function getMaxResultsViewCount() {
  return getSettingPositiveInt(
    MAX_RESULTS_VIEW_COUNT_KEY,
    DEFAULT_MAX_RESULTS_VIEW_COUNT
  )
}

// Czas braku aktywności, po którym użytkownik jest automatycznie wylogowywany -
// zob. src/components/inactivity-logout.tsx.
export const INACTIVITY_TIMEOUT_SECONDS_KEY = 'inactivity_timeout_seconds'

const DEFAULT_INACTIVITY_TIMEOUT_SECONDS = 15 * 60

export function getInactivityTimeoutSeconds() {
  return getSettingPositiveInt(
    INACTIVITY_TIMEOUT_SECONDS_KEY,
    DEFAULT_INACTIVITY_TIMEOUT_SECONDS
  )
}

export async function setInactivityTimeoutSeconds(seconds: number) {
  await prisma.settings.upsert({
    where: { key: INACTIVITY_TIMEOUT_SECONDS_KEY },
    create: { key: INACTIVITY_TIMEOUT_SECONDS_KEY, value: String(seconds) },
    update: { value: String(seconds) },
  })
}

// Ogranicza automatyczne wylogowanie z braku aktywności tylko do studentów -
// zob. src/app/layout.tsx.
export const INACTIVITY_TIMEOUT_STUDENTS_ONLY_KEY =
  'inactivity_timeout_students_only'

export async function getInactivityTimeoutStudentsOnly(): Promise<boolean> {
  const row = await prisma.settings.findUnique({
    where: { key: INACTIVITY_TIMEOUT_STUDENTS_ONLY_KEY },
  })

  return row?.value === 'true'
}

export async function setInactivityTimeoutStudentsOnly(enabled: boolean) {
  await prisma.settings.upsert({
    where: { key: INACTIVITY_TIMEOUT_STUDENTS_ONLY_KEY },
    create: {
      key: INACTIVITY_TIMEOUT_STUDENTS_ONLY_KEY,
      value: String(enabled),
    },
    update: { value: String(enabled) },
  })
}

// Liczba dni, po których wpisy w dzienniku zdarzeń (EventLog) są czyszczone -
// zob. src/app/logs/page.tsx. IP i user-agent to dane osobowe,
// więc dziennik nie powinien rosnąć bez końca.
export const EVENT_LOG_RETENTION_DAYS_KEY = 'event_log_retention_days'

const DEFAULT_EVENT_LOG_RETENTION_DAYS = 90

export function getEventLogRetentionDays() {
  return getSettingPositiveInt(
    EVENT_LOG_RETENTION_DAYS_KEY,
    DEFAULT_EVENT_LOG_RETENTION_DAYS
  )
}

export async function setEventLogRetentionDays(days: number) {
  await prisma.settings.upsert({
    where: { key: EVENT_LOG_RETENTION_DAYS_KEY },
    create: { key: EVENT_LOG_RETENTION_DAYS_KEY, value: String(days) },
    update: { value: String(days) },
  })
}

export async function setResultsLimits(
  maxApplicationNumberAttempts: number,
  maxResultsViewCount: number
) {
  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: MAX_APPLICATION_NUMBER_ATTEMPTS_KEY },
      create: {
        key: MAX_APPLICATION_NUMBER_ATTEMPTS_KEY,
        value: String(maxApplicationNumberAttempts),
      },
      update: { value: String(maxApplicationNumberAttempts) },
    }),
    prisma.settings.upsert({
      where: { key: MAX_RESULTS_VIEW_COUNT_KEY },
      create: {
        key: MAX_RESULTS_VIEW_COUNT_KEY,
        value: String(maxResultsViewCount),
      },
      update: { value: String(maxResultsViewCount) },
    }),
  ])
}

// Tryb przerwy konserwacyjnej - blokuje logowanie kontom o roli STUDENT i
// ukrywa skróty do rejestracji - zob. src/app/actions/auth.ts.
export const MAINTENANCE_MODE_KEY = 'maintenance_mode'

export async function getMaintenanceMode(): Promise<boolean> {
  const row = await prisma.settings.findUnique({
    where: { key: MAINTENANCE_MODE_KEY },
  })

  return row?.value === 'true'
}

export async function setMaintenanceMode(enabled: boolean) {
  await prisma.settings.upsert({
    where: { key: MAINTENANCE_MODE_KEY },
    create: { key: MAINTENANCE_MODE_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  })
}

// Pomija weryfikację adresu e-mail linkiem aktywacyjnym przy rejestracji -
// nowe konto trafia od razu do stanu oczekującego na akceptację
// administratora/pracownika (PENDING_APPROVAL), tak jak po zwykłym
// potwierdzeniu e-maila - zob. registerAction w src/app/actions/auth.ts.
export const SKIP_EMAIL_VERIFICATION_KEY = 'skip_email_verification'

export async function getSkipEmailVerification(): Promise<boolean> {
  const row = await prisma.settings.findUnique({
    where: { key: SKIP_EMAIL_VERIFICATION_KEY },
  })

  return row?.value === 'true'
}

export async function setSkipEmailVerification(enabled: boolean) {
  await prisma.settings.upsert({
    where: { key: SKIP_EMAIL_VERIFICATION_KEY },
    create: { key: SKIP_EMAIL_VERIFICATION_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  })
}

// Limity wysyłki AWS SES (dzienna kwota i maksymalne tempo/s) - zob.
// src/lib/mailer.ts. Widoczne w konsoli SES: Account dashboard -> Sending
// limits. Wartości domyślne odpowiadają trybowi sandbox SES.
export const AWS_DAILY_SEND_LIMIT_KEY = 'aws_daily_send_limit'
export const AWS_MAX_SEND_RATE_PER_SECOND_KEY = 'aws_max_send_rate_per_second'

const DEFAULT_AWS_DAILY_SEND_LIMIT = 180
const DEFAULT_AWS_MAX_SEND_RATE_PER_SECOND = 1

export function getAwsDailySendLimit() {
  return getSettingPositiveInt(
    AWS_DAILY_SEND_LIMIT_KEY,
    DEFAULT_AWS_DAILY_SEND_LIMIT
  )
}

export function getAwsMaxSendRatePerSecond() {
  return getSettingPositiveInt(
    AWS_MAX_SEND_RATE_PER_SECOND_KEY,
    DEFAULT_AWS_MAX_SEND_RATE_PER_SECOND
  )
}

export async function setAwsSendLimits(
  dailySendLimit: number,
  maxSendRatePerSecond: number
) {
  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: AWS_DAILY_SEND_LIMIT_KEY },
      create: { key: AWS_DAILY_SEND_LIMIT_KEY, value: String(dailySendLimit) },
      update: { value: String(dailySendLimit) },
    }),
    prisma.settings.upsert({
      where: { key: AWS_MAX_SEND_RATE_PER_SECOND_KEY },
      create: {
        key: AWS_MAX_SEND_RATE_PER_SECOND_KEY,
        value: String(maxSendRatePerSecond),
      },
      update: { value: String(maxSendRatePerSecond) },
    }),
  ])
}

export async function getNotificationEmails(): Promise<string[]> {
  const row = await prisma.settings.findUnique({
    where: { key: NOTIFICATION_EMAILS_KEY },
  })

  if (!row) return []

  try {
    const parsed: unknown = JSON.parse(row.value)

    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : []
  } catch {
    return []
  }
}

export async function setNotificationEmails(emails: string[]) {
  await prisma.settings.upsert({
    where: { key: NOTIFICATION_EMAILS_KEY },
    create: { key: NOTIFICATION_EMAILS_KEY, value: JSON.stringify(emails) },
    update: { value: JSON.stringify(emails) },
  })
}
