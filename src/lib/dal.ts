import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Role, AccountStatus } from '@/generated/prisma/enums'

/**
 * Zawsze dociąga świeży rekord z bazy, zamiast ufać payloadowi JWT z ciasteczka -
 * dzięki temu dezaktywacja konta przez admina działa natychmiast przy kolejnym zadaniu.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession()
  if (!session) return null

  let user
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        peselPositions: true,
        peselDigits: true,
        resultId: true,
        applicationNumberVerifiedAt: true,
      },
    })
  } catch (error) {
    // Rzucamy dalej zwykły Error z bezpiecznym komunikatem, żeby złapały go
    // error.tsx / global-error.tsx (SiteHeader w root layout korzysta z tej
    // funkcji na każdej stronie).
    if (isDatabaseConnectionError(error)) {
      throw new Error(DB_CONNECTION_ERROR_MESSAGE)
    }
    throw error
  }

  if (!user || user.status !== AccountStatus.ACTIVE) {
    return null
  }

  return user
})

export async function requireUser() {
  const user = await getCurrentUser()
  // Przekierowanie przez trasę czyszczącą ciasteczko, a nie bezpośrednio na /login -
  // jeśli sesja jest technicznie ważnym JWT-em, ale użytkownik zniknął/został
  // dezaktywowany w bazie, proxy.ts (który sprawdza tylko JWT, bez bazy) odbiłby
  // z powrotem na /dashboard, tworząc pętlę przekierowań.
  if (!user) redirect('/api/auth/clear-session')

  return user
}

export function homePathForRole(role: Role) {
  return role === Role.STUDENT ? '/panel' : '/dashboard'
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) {
    redirect(homePathForRole(user.role))
  }

  return user
}
