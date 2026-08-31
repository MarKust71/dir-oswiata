'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { canManageAccount } from '@/lib/permissions'
import { resendVerificationAction } from '@/app/actions/auth'
import { tryLinkUserToResult } from '@/lib/results-matching'
import {
  sendAccountActivatedEmail,
  sendAccountStatusChangeAdminNotification,
} from '@/lib/mailer'
import { getNotificationEmails } from '@/lib/settings'
import { roleLabels } from '@/lib/labels'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { AccountStatus, Role } from '@/generated/prisma/enums'

export type AdminActionState = { message?: string; error?: string } | undefined

async function loadTarget(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      peselPositions: true,
      peselDigits: true,
      resultId: true,
    },
  })
}

function toDbConnectionErrorState(error: unknown) {
  if (
    isDatabaseConnectionError(error) ||
    (error instanceof Error && error.message === DB_CONNECTION_ERROR_MESSAGE)
  ) {
    return { error: DB_CONNECTION_ERROR_MESSAGE }
  }

  return null
}

export async function setAccountStatusAction(
  userId: string,
  nextStatus: typeof AccountStatus.ACTIVE | typeof AccountStatus.DISABLED
): Promise<AdminActionState> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.USER])

    const target = await loadTarget(userId)
    if (!target) return { error: 'Nie znaleziono konta.' }

    if (!canManageAccount(actor, target)) {
      return { error: 'Brak uprawnień do zarządzania tym kontem.' }
    }

    if (
      nextStatus === AccountStatus.ACTIVE &&
      target.status !== AccountStatus.PENDING_APPROVAL &&
      target.status !== AccountStatus.DISABLED &&
      target.status !== AccountStatus.PENDING_EMAIL
    ) {
      return { error: 'Tego konta nie można teraz aktywować.' }
    }
    if (
      nextStatus === AccountStatus.DISABLED &&
      target.status !== AccountStatus.ACTIVE
    ) {
      return { error: 'Można dezaktywować tylko aktywne konta.' }
    }
    if (target.id === actor.id) {
      return { error: 'Nie możesz zmienić statusu własnego konta.' }
    }

    // Administrator może aktywować konto pomijając potwierdzenie adresu
    // e-mail linkiem aktywacyjnym.
    const activatingFromPendingEmail =
      nextStatus === AccountStatus.ACTIVE &&
      target.status === AccountStatus.PENDING_EMAIL

    // Pracownik (rola USER) nie może w ten sposób aktywować konta ucznia,
    // dla którego nie znaleziono jeszcze wyniku - bez wyniku nie ma jak
    // zweryfikować tożsamości pomijając link aktywacyjny. Może to zrobić
    // tylko administrator.
    if (
      activatingFromPendingEmail &&
      actor.role === Role.USER &&
      target.role === Role.STUDENT &&
      !target.resultId
    ) {
      return {
        error:
          'Brak wyniku dla tego konta - aktywację z pominięciem linku może wykonać tylko administrator.',
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: nextStatus,
        ...(activatingFromPendingEmail && { emailVerifiedAt: new Date() }),
        // Przy (ponownej) aktywacji dajemy uzytkownikowi swiezy komplet prob
        // wprowadzenia numeru wniosku i wyswietlen wynikow - poprzednie
        // zablokowanie zostalo juz rozwiazane przez administratora.
        ...(nextStatus === AccountStatus.ACTIVE && {
          applicationNumberAttempts: 0,
          resultsViewCount: 0,
        }),
      },
    })

    if (activatingFromPendingEmail) {
      // Token na potwierdzenie e-maila jest już zbędny - konto zostało
      // aktywowane bez niego. Próba dopasowania do wyniku, tak jak przy
      // zwykłym potwierdzeniu adresu e-mail (zob. verifyEmailAction), żeby
      // administrator widział aktualny stan powiązania od razu po aktywacji.
      await prisma.verificationToken.deleteMany({
        where: { userId: target.id },
      })

      if (target.role === Role.STUDENT && !target.resultId) {
        await tryLinkUserToResult(target)
      }
    }

    if (nextStatus === AccountStatus.ACTIVE) {
      await sendAccountActivatedEmail(target.email)
    }

    const notificationEmails = await getNotificationEmails()
    await sendAccountStatusChangeAdminNotification(
      notificationEmails,
      actor.email,
      roleLabels[actor.role],
      target.email,
      nextStatus === AccountStatus.ACTIVE
    )

    revalidatePath('/dashboard')

    return {
      message: activatingFromPendingEmail
        ? 'Konto zostało aktywowane z pominięciem potwierdzenia adresu e-mail.'
        : 'Zapisano zmianę statusu konta.',
    }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}

export async function resendVerificationEmailAction(
  userId: string
): Promise<AdminActionState> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.USER])

    const target = await loadTarget(userId)
    if (!target) return { error: 'Nie znaleziono konta.' }

    if (!canManageAccount(actor, target)) {
      return { error: 'Brak uprawnień do zarządzania tym kontem.' }
    }

    if (target.status !== AccountStatus.PENDING_EMAIL) {
      return { error: 'To konto nie oczekuje na potwierdzenie adresu e-mail.' }
    }

    await resendVerificationAction(target.email)

    return { message: 'Link aktywacyjny został wysłany ponownie.' }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}

export async function deleteAccountAction(
  userId: string
): Promise<AdminActionState> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.USER])

    if (actor.role !== Role.ADMIN) {
      return { error: 'Tylko administrator może trwale usunąć konto.' }
    }

    const target = await loadTarget(userId)
    if (!target) return { error: 'Nie znaleziono konta.' }

    if (target.id === actor.id) {
      return { error: 'Nie możesz usunąć własnego konta.' }
    }

    await prisma.user.delete({ where: { id: target.id } })

    revalidatePath('/dashboard')

    return { message: 'Konto zostało trwale usunięte.' }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}

export async function setAccountRoleAction(
  userId: string,
  nextRole: Role
): Promise<AdminActionState> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.USER])

    if (actor.role !== Role.ADMIN) {
      return { error: 'Tylko administrator może zmienić rolę użytkownika.' }
    }

    const target = await loadTarget(userId)
    if (!target) return { error: 'Nie znaleziono konta.' }

    if (target.id === actor.id) {
      return { error: 'Nie możesz zmienić własnej roli.' }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: nextRole },
    })

    revalidatePath('/dashboard')

    return { message: 'Zapisano zmianę roli.' }
  } catch (error) {
    const dbErrorState = toDbConnectionErrorState(error)
    if (dbErrorState) return dbErrorState
    throw error
  }
}
