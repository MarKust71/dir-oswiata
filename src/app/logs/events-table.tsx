'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { eventTypeLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { EventType, Role } from '@/generated/prisma/enums'
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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { buttonVariants } from '@/components/ui/button'

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'Europe/Warsaw',
})

export type EventRow = {
  id: string
  createdAt: Date
  type: EventType
  message: string
  actorEmail: string | null
  targetEmail: string | null
  ip: string | null
  userAgent: string | null
}

export function EventsTable({
  events,
  page,
  totalPages,
  prevHref,
  nextHref,
  viewerRole,
}: {
  events: EventRow[]
  page: number
  totalPages: number
  prevHref: string
  nextHref: string
  viewerRole: Role
}) {
  const showPersonalData = viewerRole === Role.ADMIN
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

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

  const normalizedQuery = query.trim().toLowerCase()
  const filteredEvents = normalizedQuery
    ? events.filter((event) =>
        event.message.toLowerCase().includes(normalizedQuery)
      )
    : events

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zdarzenia</CardTitle>
        <CardDescription>
          Najnowsze u góry.
          {showPersonalData
            ? ' Adres IP i przeglądarka to dane osobowe - widoczne tylko dla administratorów.'
            : ' Adres IP i przeglądarka to dane osobowe - widoczne tylko dla administratorów, dlatego nie są tu pokazywane.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            type="search"
            placeholder="Szukaj w wiadomości…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-sm"
          />

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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Wiadomość</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Cel</TableHead>
              {showPersonalData && (
                <>
                  <TableHead>IP</TableHead>
                  <TableHead>Przeglądarka</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showPersonalData ? 7 : 5}
                  className="text-center text-muted-foreground"
                >
                  Brak zdarzeń.
                </TableCell>
              </TableRow>
            )}
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap">
                  {dateFormatter.format(event.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {eventTypeLabels[event.type]}
                </TableCell>
                <TableCell className="max-w-md min-w-64 whitespace-normal">
                  {event.message}
                </TableCell>
                <TableCell
                  className="max-w-40 truncate"
                  title={event.actorEmail ?? undefined}
                >
                  {event.actorEmail ?? '—'}
                </TableCell>
                <TableCell
                  className="max-w-40 truncate"
                  title={event.targetEmail ?? undefined}
                >
                  {event.targetEmail ?? '—'}
                </TableCell>
                {showPersonalData && (
                  <>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {event.ip ?? '—'}
                    </TableCell>
                    <TableCell
                      className="max-w-52 truncate text-xs"
                      title={event.userAgent ?? undefined}
                    >
                      {event.userAgent ?? '—'}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <Link
              href={prevHref}
              aria-disabled={page <= 1}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page <= 1 && 'pointer-events-none opacity-50'
              )}
            >
              Poprzednia
            </Link>
            <span className="text-muted-foreground">
              Strona {page} z {totalPages}
            </span>
            <Link
              href={nextHref}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page >= totalPages && 'pointer-events-none opacity-50'
              )}
            >
              Następna
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
