'use server'

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/dal'
import { setNotificationEmails } from '@/lib/settings'
import { NotificationEmailSchema } from '@/lib/validation'
import { Role } from '@/generated/prisma/enums'

export type SettingsActionState =
  { message?: string; error?: string } | undefined

export async function updateNotificationEmailsAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
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
}
