import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { canManageAccount } from '@/lib/permissions'
import { roleLabels, statusLabels } from '@/lib/labels'
import { maskPesel } from '@/lib/pesel'
import { AccountStatus, Role } from '@/generated/prisma/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { AccountActions } from './account-actions'

const STATUS_ORDER: Record<AccountStatus, number> = {
  [AccountStatus.PENDING_APPROVAL]: 0,
  [AccountStatus.PENDING_EMAIL]: 1,
  [AccountStatus.ACTIVE]: 2,
  [AccountStatus.DISABLED]: 3,
}

const STATUS_BADGE_VARIANT: Record<
  AccountStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [AccountStatus.PENDING_APPROVAL]: 'default',
  [AccountStatus.PENDING_EMAIL]: 'outline',
  [AccountStatus.ACTIVE]: 'secondary',
  [AccountStatus.DISABLED]: 'destructive',
}

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
})

function fullName(user: { firstName: string | null; lastName: string | null }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return name || '—'
}

function NameWithPhone(user: {
  firstName: string | null
  lastName: string | null
  phone: string | null
}) {
  return (
    <div className="flex flex-col">
      <span>{fullName(user)}</span>
      {user.phone && (
        <span className="text-xs text-muted-foreground">{user.phone}</span>
      )}
    </div>
  )
}

function PeselMask({
  positions,
  digits,
}: {
  positions: number[]
  digits: string[]
}) {
  if (positions.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="font-mono text-sm whitespace-nowrap">
      {maskPesel(positions, digits).join(' ')}
    </span>
  )
}

export default async function DashboardPage() {
  const actor = await requireRole([Role.ADMIN, Role.USER])

  const users = await prisma.user.findMany({
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
    },
    orderBy: { createdAt: 'desc' },
  })

  const sorted = [...users].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  )

  const assignableRoles: Role[] =
    actor.role === Role.ADMIN
      ? [Role.STUDENT, Role.USER, Role.ADMIN]
      : [Role.STUDENT, Role.USER]

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

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>PESEL</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rejestracja</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((user) => {
                const canManage =
                  user.id !== actor.id && canManageAccount(actor, user)

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <NameWithPhone {...user} />
                    </TableCell>
                    <TableCell>
                      <PeselMask
                        positions={user.peselPositions}
                        digits={user.peselDigits}
                      />
                    </TableCell>
                    <TableCell>{roleLabels[user.role]}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[user.status]}>
                        {statusLabels[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dateFormatter.format(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <AccountActions
                        userId={user.id}
                        role={user.role}
                        status={user.status}
                        canManage={canManage}
                        assignableRoles={assignableRoles}
                        layout="compact"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: karty */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((user) => {
          const canManage =
            user.id !== actor.id && canManageAccount(actor, user)

          return (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="text-sm break-all">
                  {user.email}
                </CardTitle>
                <CardDescription>
                  {roleLabels[user.role]} - zarejestrowano{' '}
                  {dateFormatter.format(user.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Badge
                  variant={STATUS_BADGE_VARIANT[user.status]}
                  className="w-fit"
                >
                  {statusLabels[user.status]}
                </Badge>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Imię i nazwisko
                    </span>
                    <span className="text-right font-medium">
                      {fullName(user)}
                      {user.phone && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {user.phone}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">PESEL</span>
                    <PeselMask
                      positions={user.peselPositions}
                      digits={user.peselDigits}
                    />
                  </div>
                </div>
                <AccountActions
                  userId={user.id}
                  role={user.role}
                  status={user.status}
                  canManage={canManage}
                  assignableRoles={assignableRoles}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
