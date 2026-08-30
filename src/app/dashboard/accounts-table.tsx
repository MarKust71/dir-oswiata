'use client'

import { useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleCheck,
  CircleX,
  Info,
} from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ResultDetailsButton } from '@/components/result-details'

import { AccountActions } from './account-actions'

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
  timeStyle: 'medium',
  timeZone: 'Europe/Warsaw',
})

function fullName(user: { firstName: string | null; lastName: string | null }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return name || '—'
}

// Ciąg do szybkiego wyszukiwania - e-mail, imię, nazwisko i telefon połączone
// bez spacji, żeby np. "jankowalski" pasowało do "Jan Kowalski".
function searchIndex(user: {
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}) {
  return [user.email, user.firstName, user.lastName, user.phone]
    .filter(Boolean)
    .join('')
    .replace(/\s+/g, '')
    .toLowerCase()
}

type SortColumn = 'email' | 'name'
type SortDirection = 'asc' | 'desc'

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string
  column: SortColumn
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = sortColumn === column
  const Icon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <Icon className={`size-3.5 ${isActive ? '' : 'text-muted-foreground'}`} />
    </button>
  )
}

type ResultSummary = {
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

function ResultCell({
  role,
  result,
}: {
  role: Role
  result: ResultSummary | null
}) {
  if (role !== Role.STUDENT) return null

  if (result === null) {
    return <span className="text-sm text-muted-foreground">BRAK</span>
  }

  return (
    <ResultDetailsButton
      label={result.finalScore > 2 ? 'POZYTYWNY' : 'NEGATYWNY'}
      positive={result.finalScore > 2}
      result={result}
    />
  )
}

function ViewedResultCell({
  role,
  resultsViewCount,
}: {
  role: Role
  resultsViewCount: number
}) {
  if (role !== Role.STUDENT) return null

  return resultsViewCount > 0 ? (
    <CircleCheck className="size-4 text-green-600" />
  ) : (
    <CircleX className="size-4 text-destructive" />
  )
}

export type AccountRow = {
  id: string
  email: string
  role: Role
  status: AccountStatus
  createdAt: Date
  firstName: string | null
  lastName: string | null
  phone: string | null
  peselPositions: number[]
  peselDigits: string[]
  resultsViewCount: number
  result: ResultSummary | null
}

function NameWithDetails(user: AccountRow) {
  return (
    <div className="flex flex-col">
      <span>{fullName(user)}</span>
      {user.phone && (
        <span className="text-xs text-muted-foreground">{user.phone}</span>
      )}
      {user.peselPositions.length > 0 && (
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {maskPesel(user.peselPositions, user.peselDigits).join(' ')}
        </span>
      )}
    </div>
  )
}

export function AccountsTable({
  users,
  actorId,
  actorRole,
  assignableRoles,
  description,
  filters,
}: {
  users: AccountRow[]
  actorId: string
  actorRole: Role
  assignableRoles: Role[]
  description: ReactNode
  filters: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  function toggleSort(column: SortColumn) {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      setSortDirection('desc')
    } else {
      setSortColumn(null)
    }
  }

  const normalizedQuery = query.replace(/\s+/g, '').toLowerCase()
  const filteredUsers = normalizedQuery
    ? users.filter((user) => searchIndex(user).includes(normalizedQuery))
    : users

  // Sortowanie po stronie klienta - dotyczy tylko widoku, kolejność z serwera
  // (po e-mailu) wraca po trzecim kliknięciu tego samego nagłówka.
  const sortedUsers = sortColumn
    ? [...filteredUsers].sort((a, b) => {
        const comparison =
          sortColumn === 'email'
            ? a.email.localeCompare(b.email, 'pl')
            : fullName(a).localeCompare(fullName(b), 'pl')

        return sortDirection === 'asc' ? comparison : -comparison
      })
    : filteredUsers

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Zarządzanie kontami{' '}
          <span className="font-normal text-xl">({filteredUsers.length})</span>
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {filters}
      </div>

      <Input
        type="search"
        placeholder="Szukaj po e-mailu, imieniu, nazwisku lub telefonie…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    label="E-mail"
                    column="email"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Imię i nazwisko"
                    column="name"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
                <TableHead>Wynik</TableHead>
                <TableHead>
                  W.w.
                  <sup>
                    <Tooltip>
                      <TooltipTrigger aria-label="Widział wynik">
                        <Info className="size-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Widział wynik</TooltipContent>
                    </Tooltip>
                  </sup>
                </TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rejestracja</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => {
                const canManage =
                  user.id !== actorId &&
                  canManageAccount({ role: actorRole }, user)

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <NameWithDetails {...user} />
                    </TableCell>
                    <TableCell>
                      <ResultCell role={user.role} result={user.result} />
                    </TableCell>
                    <TableCell>
                      <ViewedResultCell
                        role={user.role}
                        resultsViewCount={user.resultsViewCount}
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
                        email={user.email}
                        role={user.role}
                        status={user.status}
                        canManage={canManage}
                        canDelete={canManage && actorRole === Role.ADMIN}
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
        {sortedUsers.map((user) => {
          const canManage =
            user.id !== actorId && canManageAccount({ role: actorRole }, user)

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
                      {user.peselPositions.length > 0 && (
                        <span className="block font-mono text-xs font-normal whitespace-nowrap text-muted-foreground">
                          {maskPesel(
                            user.peselPositions,
                            user.peselDigits
                          ).join(' ')}
                        </span>
                      )}
                    </span>
                  </div>
                  {user.role === Role.STUDENT && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Wynik</span>
                      <ResultCell role={user.role} result={user.result} />
                    </div>
                  )}
                  {user.role === Role.STUDENT && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Widział wynik
                      </span>
                      <ViewedResultCell
                        role={user.role}
                        resultsViewCount={user.resultsViewCount}
                      />
                    </div>
                  )}
                </div>
                <AccountActions
                  userId={user.id}
                  email={user.email}
                  role={user.role}
                  status={user.status}
                  canManage={canManage}
                  canDelete={canManage && actorRole === Role.ADMIN}
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
