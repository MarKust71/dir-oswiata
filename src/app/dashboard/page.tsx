import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { Role } from '@/generated/prisma/enums'

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

  return (
    <AccountsTable
      users={users}
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
