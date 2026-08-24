import 'server-only'

import { prisma } from '@/lib/prisma'
import { Role } from '@/generated/prisma/enums'

/**
 * Próbuje automatycznie skojarzyć konto z rekordem w tabeli Results - dopasowanie
 * po imieniu, nazwisku i cyfrach numeru PESEL ujawnionych przy rejestracji
 * (positions/digits - pełnego numeru PESEL nie przechowujemy). Łączy tylko wtedy,
 * gdy pasuje dokładnie jeden, jeszcze niepowiązany z żadnym kontem rekord - przy
 * braku dopasowania lub niejednoznaczności konto zostaje bez powiązania (może je
 * ustawić administrator ręcznie). Zwraca true, jeśli powiązanie zostało zapisane.
 */
export async function tryLinkUserToResult(user: {
  id: string
  firstName: string | null
  lastName: string | null
  peselPositions: number[]
  peselDigits: string[]
}) {
  if (!user.firstName || !user.lastName || user.peselPositions.length === 0) {
    return false
  }

  const candidates = await prisma.results.findMany({
    where: {
      firstName: user.firstName,
      lastName: user.lastName,
      user: null,
    },
    select: { id: true, pesel: true },
  })

  const matches = candidates.filter((candidate) =>
    user.peselPositions.every(
      (position, i) => candidate.pesel[position] === user.peselDigits[i]
    )
  )

  if (matches.length !== 1) return false

  await prisma.user.update({
    where: { id: user.id },
    data: { resultId: matches[0].id },
  })

  return true
}

/**
 * Po zaimportowaniu nowych danych do Results (import zastępuje poprzednie dane,
 * więc wszystkie dotychczasowe powiązania zostały już wyzerowane kaskadowo przez
 * ON DELETE SET NULL) przegląda wszystkie jeszcze niepowiązane konta STUDENT i
 * próbuje dla każdego znaleźć pasujący wynik. Zwraca liczbę nowo powiązanych kont.
 */
export async function relinkAllStudentsToResults() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT, resultId: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      peselPositions: true,
      peselDigits: true,
    },
  })

  let linkedCount = 0
  for (const student of students) {
    if (await tryLinkUserToResult(student)) linkedCount++
  }

  return linkedCount
}
