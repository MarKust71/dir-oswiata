import 'server-only'

import { prisma } from '@/lib/prisma'
import { Role } from '@/generated/prisma/enums'

type LinkableUser = {
  id: string
  firstName: string | null
  lastName: string | null
  peselPositions: number[]
  peselDigits: string[]
}

type LinkedResult = {
  firstName: string
  lastName: string
  pesel: string
}

/**
 * Sprawdza, czy dany rekord wyniku pasuje do konta po imieniu, nazwisku i
 * cyfrach numeru PESEL ujawnionych przy rejestracji (positions/digits -
 * pełnego numeru PESEL nie przechowujemy).
 */
function resultMatchesUser(user: LinkableUser, result: LinkedResult) {
  return (
    user.firstName === result.firstName &&
    user.lastName === result.lastName &&
    user.peselPositions.length > 0 &&
    user.peselPositions.every(
      (position, i) => result.pesel[position] === user.peselDigits[i]
    )
  )
}

/**
 * Próbuje automatycznie skojarzyć konto z rekordem w tabeli Results - dopasowanie
 * po imieniu, nazwisku i cyfrach numeru PESEL ujawnionych przy rejestracji.
 * Łączy tylko wtedy, gdy pasuje dokładnie jeden, jeszcze niepowiązany z żadnym
 * kontem rekord - przy braku dopasowania lub niejednoznaczności konto zostaje
 * bez powiązania (może je ustawić administrator ręcznie). Zwraca true, jeśli
 * powiązanie zostało zapisane.
 */
export async function tryLinkUserToResult(user: LinkableUser) {
  if (!user.firstName || !user.lastName || user.peselPositions.length === 0) {
    return false
  }

  const candidates = await prisma.results.findMany({
    where: {
      firstName: user.firstName,
      lastName: user.lastName,
      user: null,
    },
    select: { id: true, firstName: true, lastName: true, pesel: true },
  })

  const matches = candidates.filter((candidate) =>
    resultMatchesUser(user, candidate)
  )

  if (matches.length !== 1) return false

  await prisma.user.update({
    where: { id: user.id },
    data: { resultId: matches[0].id },
  })

  return true
}

/**
 * Przegląda wszystkie konta STUDENT: dla niepowiązanych próbuje znaleźć
 * pasujący wynik (jak przy aktywacji konta), a dla już powiązanych weryfikuje,
 * czy istniejące powiązanie nadal jest poprawne - jeśli dane konta (imię,
 * nazwisko, maska PESEL) przestały pasować do przypisanego wyniku (np. po
 * korekcie danych konta), powiązanie jest usuwane. Wywoływane automatycznie po
 * imporcie wyników (poprzednie powiązania są wtedy już wyzerowane kaskadowo
 * przez ON DELETE SET NULL) oraz ręcznie z panelu Ustawienia. Zwraca liczby:
 * nowo powiązanych, rozłączonych (niepasujących już) i niezmienionych
 * poprawnych powiązań.
 */
export async function relinkAllStudentsToResults() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      peselPositions: true,
      peselDigits: true,
      resultId: true,
      result: { select: { firstName: true, lastName: true, pesel: true } },
    },
  })

  let linkedCount = 0
  let unlinkedCount = 0
  let unchangedCount = 0

  for (const student of students) {
    if (student.resultId && student.result) {
      if (resultMatchesUser(student, student.result)) {
        unchangedCount++
      } else {
        await prisma.user.update({
          where: { id: student.id },
          data: { resultId: null },
        })
        unlinkedCount++
      }
    } else if (await tryLinkUserToResult(student)) {
      linkedCount++
    }
  }

  return { linkedCount, unlinkedCount, unchangedCount }
}
