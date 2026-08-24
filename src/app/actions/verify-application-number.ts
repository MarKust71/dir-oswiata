'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { getNotificationEmails } from '@/lib/settings'
import {
  sendAccountLockedAdminNotification,
  sendAccountLockedUserEmail,
  sendResultsViewLimitReachedAdminNotification,
  sendResultsViewLimitReachedUserEmail,
} from '@/lib/mailer'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { AccountStatus, Role } from '@/generated/prisma/enums'

const MAX_WRONG_ATTEMPTS = 3
const MAX_RESULT_VIEWS = 3

type ResultDetails = {
  firstName: string
  lastName: string
  pesel: string
  practicalScore: number
  theoryScore: number
  finalScore: number
  oralScore: number
  writtenScore: number
  profession: string
  applicationNumber: string
}

export type VerifyApplicationNumberState =
  | { status: 'error'; message: string; attemptsRemaining?: number }
  | { status: 'locked'; message: string }
  | { status: 'success'; result: ResultDetails; accountLocked: boolean }
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
        resultsViewCount: true,
        result: {
          select: {
            firstName: true,
            lastName: true,
            pesel: true,
            practicalScore: true,
            theoryScore: true,
            finalScore: true,
            oralScore: true,
            writtenScore: true,
            profession: true,
            applicationNumber: true,
          },
        },
      },
    })

    if (!user || !user.result) {
      return {
        status: 'error',
        message: 'Nie znaleziono wyniku powiązanego z Twoim kontem.',
      }
    }

    const inputValue = String(formData.get('applicationNumber') ?? '')
    const normalizedInput = normalizeApplicationNumber(inputValue)
    const normalizedExpected = normalizeApplicationNumber(
      user.result.applicationNumber
    )

    if (normalizedInput.length > 0 && normalizedInput === normalizedExpected) {
      const nextViews = user.resultsViewCount + 1
      const reachedViewLimit = nextViews >= MAX_RESULT_VIEWS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resultsViewCount: nextViews,
          ...(reachedViewLimit && { status: AccountStatus.DISABLED }),
        },
      })

      if (reachedViewLimit) {
        const notificationEmails = await getNotificationEmails()
        await sendResultsViewLimitReachedAdminNotification(
          notificationEmails,
          user.email
        )
        await sendResultsViewLimitReachedUserEmail(user.email)
      }

      return {
        status: 'success',
        result: user.result,
        accountLocked: reachedViewLimit,
      }
    }

    const nextAttempts = user.applicationNumberAttempts + 1

    if (nextAttempts >= MAX_WRONG_ATTEMPTS) {
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
      attemptsRemaining: MAX_WRONG_ATTEMPTS - nextAttempts,
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
