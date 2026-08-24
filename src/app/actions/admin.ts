'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { canManageAccount, canAssignRole } from '@/lib/permissions'
import { sendAccountActivatedEmail } from '@/lib/mailer'
import { tryLinkUserToResult } from '@/lib/results-matching'
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
      target.status !== AccountStatus.DISABLED
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

    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: nextStatus,
        // Przy (ponownej) aktywacji dajemy uzytkownikowi swiezy komplet prob
        // wprowadzenia numeru wniosku i wyswietlen wynikow - poprzednie
        // zablokowanie zostalo juz rozwiazane przez administratora.
        ...(nextStatus === AccountStatus.ACTIVE && {
          applicationNumberAttempts: 0,
          resultsViewCount: 0,
        }),
      },
    })

    if (nextStatus === AccountStatus.ACTIVE) {
      await sendAccountActivatedEmail(target.email)

      // Automatyczne powiązanie z wynikiem egzaminu próbujemy dopiero po pełnej
      // finalizacji zakładania konta (e-mail potwierdzony + akceptacja admina),
      // nie przy ponownej aktywacji wcześniej dezaktywowanego konta.
      if (
        target.status === AccountStatus.PENDING_APPROVAL &&
        !target.resultId
      ) {
        await tryLinkUserToResult(target)
      }
    }

    revalidatePath('/dashboard')

    return { message: 'Zapisano zmianę statusu konta.' }
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

    const target = await loadTarget(userId)
    if (!target) return { error: 'Nie znaleziono konta.' }

    if (target.id === actor.id) {
      return { error: 'Nie możesz zmienić własnej roli.' }
    }
    if (!canManageAccount(actor, target)) {
      return { error: 'Brak uprawnień do zarządzania tym kontem.' }
    }
    if (!canAssignRole(actor, nextRole)) {
      return { error: 'Brak uprawnień do nadania tej roli.' }
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
