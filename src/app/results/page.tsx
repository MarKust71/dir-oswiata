import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { Role } from '@/generated/prisma/enums'

import { ResultsTable } from './results-table'

export default async function ResultsPage() {
  await requireRole([Role.ADMIN, Role.USER])

  const results = await prisma.results.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
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
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Wyniki egzaminów
        </h1>
        <p className="text-sm text-muted-foreground">
          Przegląd danych zaimportowanych z pliku wyników.
        </p>
      </div>

      <ResultsTable results={results} />
    </div>
  )
}
