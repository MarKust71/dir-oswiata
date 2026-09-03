import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { getEventLogRetentionDays } from '@/lib/settings'
import { cleanupExpiredEvents } from '@/lib/event-log'
import { Role, EventType } from '@/generated/prisma/enums'
import { buttonVariants } from '@/components/ui/button'

import { EventTypeFilter } from './event-type-filter'
import { EventsTable } from './events-table'

const PAGE_SIZE = 50

function isEventType(value: string): value is EventType {
  return (Object.values(EventType) as string[]).includes(value)
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string; q?: string }>
}) {
  const user = await requireRole([Role.ADMIN, Role.USER])

  const params = await searchParams
  const type = params.type && isEventType(params.type) ? params.type : undefined
  const q = params.q?.trim() || undefined
  const page = Math.max(1, Number(params.page) || 1)

  // Czyszczenie starych wpisów uruchamiane przy wizycie na tej stronie, a nie
  // przy każdym zapisie zdarzenia (jak w RegistrationAttempt/EmailSendLog) -
  // to długoterminowy dziennik, więc sprzątanie przy każdym wpisie byłoby
  // zbędnym obciążeniem; wizyta administratora to naturalna okazja.
  const retentionDays = await getEventLogRetentionDays()
  await cleanupExpiredEvents(retentionDays)

  // Filtr typu i wyszukiwanie w treści wiadomości nakładane są na poziomie
  // zapytania do bazy - przed stronicowaniem (skip/take) - żeby "Strona X z Y"
  // i wyniki na danej stronie dotyczyły przefiltrowanego zbioru, a nie tylko
  // 50 najnowszych wpisów.
  const where = {
    ...(type ? { type } : {}),
    ...(q ? { message: { contains: q, mode: 'insensitive' as const } } : {}),
  }

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
    if (q) p.set('q', q)
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
            e-maili i od ulotnych logów serwera. Wpisy starsze niż{' '}
            {retentionDays} dni są automatycznie usuwane
            {user.role === Role.ADMIN ? ' (zmień w Ustawieniach)' : ''}.
          </p>
        </div>
        {user.role === Role.ADMIN && (
          <Link
            href="/settings"
            className={buttonVariants({ variant: 'outline' })}
          >
            Wróć do ustawień
          </Link>
        )}
      </div>

      <EventTypeFilter initialType={type} />

      <EventsTable
        events={events}
        page={page}
        totalPages={totalPages}
        prevHref={pageParam(page - 1)}
        nextHref={pageParam(page + 1)}
        viewerRole={user.role}
        initialQuery={q ?? ''}
      />
    </div>
  )
}
