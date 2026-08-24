'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { getNotificationEmails } from '@/lib/settings'
import {
  sendAccountLockedAdminNotification,
  sendAccountLockedUserEmail,
} from '@/lib/mailer'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { AccountStatus, Role } from '@/generated/prisma/enums'

const MAX_ATTEMPTS = 3

export type VerifyApplicationNumberState =
  | { status: 'error'; message: string; attemptsRemaining?: number }
  | { status: 'locked'; message: string }
  | { status: 'success' }
  | undefined

// Do porownania bierzemy tylko cyfry i "/" - zeby np. spacje czy myslniki
// w numerze wniosku nie wplywaly na wynik weryfikacji.
function normalizeApplicationNumber(value: string): string {
  return value.replace(/[^\d/]/g, '')
}

export async function verifyApplicationNumberAction(
  _state: VerifyApplicationNumberState,
  formData: FormData
): Promise<VerifyApplicationNumberState> {
  try {
    const actor = await requireRole([Role.STUDENT])

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        email: true,
        applicationNumberAttempts: true,
        applicationNumberVerifiedAt: true,
        result: { select: { applicationNumber: true } },
      },
    })

    if (!user || !user.result) {
      return {
        status: 'error',
        message: 'Nie znaleziono wyniku powiązanego z Twoim kontem.',
      }
    }

    if (user.applicationNumberVerifiedAt) {
      return { status: 'success' }
    }

    const inputValue = String(formData.get('applicationNumber') ?? '')
    const normalizedInput = normalizeApplicationNumber(inputValue)
    const normalizedExpected = normalizeApplicationNumber(
      user.result.applicationNumber
    )

    if (normalizedInput.length > 0 && normalizedInput === normalizedExpected) {
      await prisma.user.update({
        where: { id: user.id },
        data: { applicationNumberVerifiedAt: new Date() },
      })

      return { status: 'success' }
    }

    const nextAttempts = user.applicationNumberAttempts + 1

    if (nextAttempts >= MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          applicationNumberAttempts: nextAttempts,
          status: AccountStatus.DISABLED,
        },
      })

      const notificationEmails = await getNotificationEmails()
      await sendAccountLockedAdminNotification(notificationEmails, user.email)
      await sendAccountLockedUserEmail(user.email)

      return {
        status: 'locked',
        message:
          'Twoje konto "DIR Oświata" zostało zablokowane. Skontaktuj się z administratorem.',
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { applicationNumberAttempts: nextAttempts },
    })

    return {
      status: 'error',
      message: 'Nieprawidłowy numer wniosku.',
      attemptsRemaining: MAX_ATTEMPTS - nextAttempts,
    }
  } catch (error) {
    if (
      isDatabaseConnectionError(error) ||
      (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
    ) {
      return { status: 'error', message: DB_CONNECTION_ERROR_MESSAGE }
    }
    throw error
  }
}
