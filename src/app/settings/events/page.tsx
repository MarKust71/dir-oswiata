import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { eventTypeLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { Role, EventType } from '@/generated/prisma/enums'
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
import { buttonVariants } from '@/components/ui/button'

import { EventTypeFilter } from './event-type-filter'

const PAGE_SIZE = 50

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'Europe/Warsaw',
})

function isEventType(value: string): value is EventType {
  return (Object.values(EventType) as string[]).includes(value)
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  await requireRole([Role.ADMIN])

  const params = await searchParams
  const type = params.type && isEventType(params.type) ? params.type : undefined
  const page = Math.max(1, Number(params.page) || 1)

  const where = type ? { type } : {}

  const [events, totalCount] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.eventLog.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const pageParam = (targetPage: number) => {
    const p = new URLSearchParams()
    if (type) p.set('type', type)
    p.set('page', String(targetPage))

    return `?${p.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Dziennik zdarzeń{' '}
            <span className="font-normal text-xl">({totalCount})</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Trwały zapis zdarzeń aplikacji - niezależny od dostarczalności
            e-maili i od ulotnych logów serwera.
          </p>
        </div>
        <Link
          href="/settings"
          className={buttonVariants({ variant: 'outline' })}
        >
          Wróć do ustawień
        </Link>
      </div>

      <EventTypeFilter initialType={type} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zdarzenia</CardTitle>
          <CardDescription>
            Najnowsze u góry. Adres IP i przeglądarka to dane osobowe - widoczne
            tylko dla administratorów.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Wiadomość</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Cel</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Przeglądarka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Brak zdarzeń.
                  </TableCell>
                </TableRow>
              )}
              {events.map((event) => (
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
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {event.ip ?? '—'}
                  </TableCell>
                  <TableCell
                    className="max-w-52 truncate text-xs"
                    title={event.userAgent ?? undefined}
                  >
                    {event.userAgent ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <Link
                href={pageParam(page - 1)}
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
                href={pageParam(page + 1)}
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
    </div>
  )
}
