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
