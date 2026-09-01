import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { Role } from '@/generated/prisma/enums'

import { ResultsTable } from './results-table'

export default async function ResultsPage() {
  await requireRole([Role.ADMIN, Role.USER])

  const results = await prisma.results.findMany({
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
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

  return <ResultsTable results={results} />
}
