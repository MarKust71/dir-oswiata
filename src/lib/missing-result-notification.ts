import 'server-only'

import { prisma } from '@/lib/prisma'
import { getNotificationEmails } from '@/lib/settings'
import { sendMissingResultAdminNotification } from '@/lib/mailer'

const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000

/**
 * Powiadamia administratora mailem, że zalogowany student nie ma dopasowanego
 * wyniku w okresie udostępniania wyników - zob. src/app/panel/page.tsx. Żeby
 * nie zalewać skrzynki przy każdym odświeżeniu strony, wysyłka jest ograniczona
 * do raz na dobę na użytkownika (User.missingResultNotifiedAt).
 */
export async function notifyMissingResultIfNeeded(user: {
  id: string
  email: string
  missingResultNotifiedAt: Date | null
}) {
  const now = new Date()

  if (
    user.missingResultNotifiedAt &&
    now.getTime() - user.missingResultNotifiedAt.getTime() <
      NOTIFICATION_COOLDOWN_MS
  ) {
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { missingResultNotifiedAt: now },
  })

  const adminEmails = await getNotificationEmails()
  await sendMissingResultAdminNotification(adminEmails, user.email)
}
