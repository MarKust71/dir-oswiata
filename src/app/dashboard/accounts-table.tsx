'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleCheck,
  CircleX,
  Info,
} from 'lucide-react'

import { resendVerificationEmailAction } from '@/app/actions/admin'
import { canManageAccount } from '@/lib/permissions'
import { roleLabels, statusLabels } from '@/lib/labels'
import { maskPesel } from '@/lib/pesel'
import { cn } from '@/lib/utils'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

// Status "Oczekuje na e-mail" jest klikalny (dla osób z uprawnieniem do
// zarządzania kontem) - pozwala ponownie wysłać link aktywacyjny bez
// przechodzenia do osobnego widoku.
function AccountStatusBadge({
  userId,
  status,
  canManage,
  className,
}: {
  userId: string
  status: AccountStatus
  canManage: boolean
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (status !== AccountStatus.PENDING_EMAIL || !canManage) {
    return (
      <Badge variant={STATUS_BADGE_VARIANT[status]} className={className}>
        {statusLabels[status]}
      </Badge>
    )
  }

  function handleResend() {
    setConfirmOpen(false)
    startTransition(async () => {
      const res = await resendVerificationEmailAction(userId)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  return (
    <>
      <Badge
        variant={STATUS_BADGE_VARIANT[status]}
        className={cn('cursor-pointer', className)}
        role="button"
        tabIndex={0}
        aria-disabled={pending}
        onClick={() => !pending && setConfirmOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!pending) setConfirmOpen(true)
          }
        }}
      >
        {statusLabels[status]}
      </Badge>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ponowna wysyłka linku aktywacyjnego
            </AlertDialogTitle>
            <AlertDialogDescription>
              Próbujesz ponownie wysłać link aktywacyjny. Kontynuować?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleResend}>Wyślij</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

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
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [hideViewed, setHideViewed] = useState(false)

  // Odświeżanie w tle co 60 s (z uwzględnieniem obecnych filtrów w URL) -
  // router.refresh() tylko ponownie pobiera dane z serwera, nie generuje
  // żadnego z eventów (mousedown/mousemove/keydown/scroll/touchstart)
  // śledzonych przez InactivityLogout, więc nie wpływa na czas do
  // automatycznego wylogowania.
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      router.refresh()
    }, 60_000)

    return () => clearInterval(interval)
  }, [autoRefresh, router])

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
  const searchedUsers = normalizedQuery
    ? users.filter((user) => searchIndex(user).includes(normalizedQuery))
    : users
  const filteredUsers = hideViewed
    ? searchedUsers.filter(
        (user) => !(user.role === Role.STUDENT && user.resultsViewCount > 0)
      )
    : searchedUsers

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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          type="search"
          placeholder="Szukaj po e-mailu, imieniu, nazwisku lub telefonie…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="hide-viewed"
              checked={hideViewed}
              onCheckedChange={setHideViewed}
            />
            <Label
              htmlFor="hide-viewed"
              className="text-sm text-muted-foreground"
            >
              Ukryj w.w.
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label
              htmlFor="auto-refresh"
              className="text-sm text-muted-foreground"
            >
              Odśwież automatycznie
            </Label>
          </div>
        </div>
      </div>

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
                const disableActivateFromPendingEmail =
                  actorRole === Role.USER &&
                  user.role === Role.STUDENT &&
                  user.result === null

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
                      <AccountStatusBadge
                        userId={user.id}
                        status={user.status}
                        canManage={canManage}
                      />
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
                        disableActivateFromPendingEmail={
                          disableActivateFromPendingEmail
                        }
                        resultsViewCount={user.resultsViewCount}
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
          const disableActivateFromPendingEmail =
            actorRole === Role.USER &&
            user.role === Role.STUDENT &&
            user.result === null

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
                <AccountStatusBadge
                  userId={user.id}
                  status={user.status}
                  canManage={canManage}
                  className="w-fit"
                />
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
                  disableActivateFromPendingEmail={
                    disableActivateFromPendingEmail
                  }
                  resultsViewCount={user.resultsViewCount}
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
