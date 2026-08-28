export type ResultOutcome = 'positive' | 'negative' | 'none'

export const ALL_RESULT_OUTCOMES: readonly ResultOutcome[] = [
  'positive',
  'negative',
  'none',
]

export const resultOutcomeLabels: Record<ResultOutcome, string> = {
  positive: 'Pozytywny',
  negative: 'Negatywny',
  none: 'Brak',
}

export function parseSelectedResultOutcomes(
  resultParam: string | string[] | undefined
): ResultOutcome[] {
  if (resultParam === undefined) return [...ALL_RESULT_OUTCOMES]

  const raw = Array.isArray(resultParam) ? resultParam : resultParam.split(',')

  return raw.filter((value): value is ResultOutcome =>
    (ALL_RESULT_OUTCOMES as readonly string[]).includes(value)
  )
}
