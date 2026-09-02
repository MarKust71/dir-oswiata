import type { ReactNode } from 'react'

import { prisma } from '@/lib/prisma'
import { formatWarsawTimestamp } from '@/lib/warsaw-time'
import { Role } from '@/generated/prisma/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { RefreshButton } from './refresh-button'

function formatPercent(part: number, whole: number): string {
  if (whole === 0) return '—'

  return `${((part / whole) * 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="font-heading text-3xl font-semibold">
        {value.toLocaleString('pl-PL')}
      </CardContent>
    </Card>
  )
}

export default async function StatisticsPage() {
  const [totalResults, totalAccounts, linkedAccounts, viewedAccounts] =
    await Promise.all([
      prisma.results.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({
        where: { role: Role.STUDENT, resultId: { not: null } },
      }),
      prisma.user.count({
        where: { role: Role.STUDENT, resultsViewCount: { gt: 0 } },
      }),
    ])

  const unlinkedAccounts = totalAccounts - linkedAccounts
  const notViewedAccounts = linkedAccounts - viewedAccounts

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Statystyki</h1>
          <p className="text-sm text-muted-foreground">
            Stan na: {formatWarsawTimestamp(new Date())}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Wyeksportowane wyniki"
          value={totalResults}
          description="Osoby z wynikiem wyeksportowanym z Merlina do aplikacji."
        />

        <StatCard
          title="Założone konta"
          value={totalAccounts}
          description={`${formatPercent(totalAccounts, totalResults)} osób z wyeksportowanym wynikiem`}
        />

        <StatCard
          title="Połączone z wynikiem"
          value={linkedAccounts}
          description={`${formatPercent(linkedAccounts, totalAccounts)} założonych kont, ${formatPercent(linkedAccounts, totalResults)} wszystkich wyników`}
        />

        <StatCard
          title="Niepołączone z wynikiem"
          value={unlinkedAccounts}
          description={`Błędne dane, konta dotyczące tej samej osoby itp., ${formatPercent(linkedAccounts, totalAccounts)} założonych kont, ${formatPercent(linkedAccounts, totalResults)} wszystkich wyników`}
        />

        <StatCard
          title="Wyświetliły wynik"
          value={viewedAccounts}
          description={`${formatPercent(viewedAccounts, linkedAccounts)} kont połączonych z wynikiem`}
        />

        <StatCard
          title="Jeszcze nie wyświetliły wyniku"
          value={notViewedAccounts}
          description={`${formatPercent(notViewedAccounts, linkedAccounts)} kont połączonych z wynikiem`}
        />
      </div>
    </div>
  )
}
