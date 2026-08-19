import 'server-only'

import { prisma } from '@/lib/prisma'

export const NOTIFICATION_EMAILS_KEY = 'emails_for_notifications'

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
