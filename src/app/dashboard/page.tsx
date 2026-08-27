import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { Role } from '@/generated/prisma/enums'

import { AccountsTable } from './accounts-table'
import { RoleFilter } from './role-filter'
import { StatusFilter } from './status-filter'
import { parseSelectedRoles } from './roles'
import { parseSelectedStatuses } from './statuses'

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const actor = await requireRole([Role.ADMIN, Role.USER])

  const searchParams = await props.searchParams
  const selectedRoles = parseSelectedRoles(searchParams.role)
  const selectedStatuses = parseSelectedStatuses(searchParams.status)

  const users = await prisma.user.findMany({
    where: { role: { in: selectedRoles }, status: { in: selectedStatuses } },
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Zarządzanie kontami
        </h1>
        <p className="text-sm text-muted-foreground">
          Zatwierdzaj nowe konta i zarządzaj rolami użytkowników.
          {actor.role === Role.USER &&
            ' Konta z rolą Administrator są widoczne, ale poza Twoimi uprawnieniami.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <RoleFilter
          key={selectedRoles.join(',')}
          initialRoles={selectedRoles}
        />
        <StatusFilter
          key={selectedStatuses.join(',')}
          initialStatuses={selectedStatuses}
        />
      </div>

      <AccountsTable
        users={users}
        actorId={actor.id}
        actorRole={actor.role}
        assignableRoles={assignableRoles}
      />
    </div>
  )
}
