import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { AccountStatus, EventType, Role } from '@/generated/prisma/enums'

import { AccountsTable } from './accounts-table'
import { RoleFilter } from './role-filter'
import { StatusFilter } from './status-filter'
import { ResultFilter } from './result-filter'
import { parseSelectedRoles } from './roles'
import { parseSelectedStatuses } from './statuses'
import { parseSelectedResultOutcomes } from './result-outcomes'

function resultOutcomeCondition(
  outcome: 'positive' | 'negative' | 'none'
): Prisma.UserWhereInput {
  switch (outcome) {
    case 'positive':
      return { result: { finalScore: { gt: 2 } } }
    case 'negative':
      return { result: { finalScore: { lte: 2 } } }
    case 'none':
      return { resultId: null }
  }
}

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const actor = await requireRole([Role.ADMIN, Role.USER])

  const searchParams = await props.searchParams
  const selectedRoles = parseSelectedRoles(searchParams.role)
  const selectedStatuses = parseSelectedStatuses(searchParams.status)
  const selectedResultOutcomes = parseSelectedResultOutcomes(
    searchParams.result
  )

  const users = await prisma.user.findMany({
    where: {
      role: { in: selectedRoles },
      status: { in: selectedStatuses },
      OR:
        selectedResultOutcomes.length > 0
          ? selectedResultOutcomes.map(resultOutcomeCondition)
          : [{ id: '' }],
    },
    orderBy: { email: 'asc' },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      phone: true,
      peselPositions: true,
      peselDigits: true,
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

  // Zmianę roli może wykonać wyłącznie administrator - dla pozostałych
  // brak przypisywalnych ról ukrywa selektor w AccountActions.
  const assignableRoles: Role[] =
    actor.role === Role.ADMIN ? [Role.STUDENT, Role.USER, Role.ADMIN] : []

  // Konto zablokowane po 3 błędnych numerach wniosku wymaga ostrzeżenia przy
  // ponownej aktywacji (patrz resultsViewCount niżej) - ustalamy to z dziennika
  // zdarzeń, biorąc najnowszy z wpisów decydujących o obecnym statusie konta:
  // jeśli to on jest przyczyną blokady, aktywacja przyzna nowy komplet prób.
  const disabledUserIds = users
    .filter((user) => user.status === AccountStatus.DISABLED)
    .map((user) => user.id)

  const lockReasonByUserId = new Map<string, EventType>()
  if (disabledUserIds.length > 0) {
    const lockEvents = await prisma.eventLog.findMany({
      where: {
        targetUserId: { in: disabledUserIds },
        type: {
          in: [
            EventType.ACCOUNT_LOCKED_APPLICATION_NUMBER,
            EventType.ACCOUNT_LOCKED_RESULTS_VIEW_LIMIT,
            EventType.ACCOUNT_DEACTIVATED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { targetUserId: true, type: true },
    })
    for (const event of lockEvents) {
      if (event.targetUserId && !lockReasonByUserId.has(event.targetUserId)) {
        lockReasonByUserId.set(event.targetUserId, event.type)
      }
    }
  }

  const usersWithLockInfo = users.map((user) => ({
    ...user,
    lockedByApplicationNumber:
      lockReasonByUserId.get(user.id) ===
      EventType.ACCOUNT_LOCKED_APPLICATION_NUMBER,
  }))

  return (
    <AccountsTable
      users={usersWithLockInfo}
      actorId={actor.id}
      actorRole={actor.role}
      assignableRoles={assignableRoles}
      description={
        <>
          Zatwierdzaj nowe konta i zarządzaj rolami użytkowników.
          {actor.role === Role.USER &&
            ' Konta z rolą Administrator są widoczne, ale poza Twoimi uprawnieniami.'}
        </>
      }
      filters={
        <>
          <RoleFilter
            key={selectedRoles.join(',')}
            initialRoles={selectedRoles}
          />
          <StatusFilter
            key={selectedStatuses.join(',')}
            initialStatuses={selectedStatuses}
          />
          <ResultFilter
            key={selectedResultOutcomes.join(',')}
            initialOutcomes={selectedResultOutcomes}
          />
        </>
      }
    />
  )
}
