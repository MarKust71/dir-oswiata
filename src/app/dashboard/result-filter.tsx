'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

import {
  ALL_RESULT_OUTCOMES,
  resultOutcomeLabels,
  type ResultOutcome,
} from './result-outcomes'

export function ResultFilter({
  initialOutcomes,
}: {
  initialOutcomes: ResultOutcome[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedOutcomes, setSelectedOutcomes] = useState(initialOutcomes)
  // Śledzi ostatnio wybrane wyniki synchronicznie, żeby kolejne szybkie
  // kliknięcia liczyły się od aktualnego stanu, a nie od tego sprzed
  // zakończenia nawigacji.
  const selectedOutcomesRef = useRef(initialOutcomes)

  function toggleOutcome(outcome: ResultOutcome) {
    const prev = selectedOutcomesRef.current
    const next = prev.includes(outcome)
      ? prev.filter((o) => o !== outcome)
      : [...prev, outcome]

    selectedOutcomesRef.current = next
    setSelectedOutcomes(next)

    const params = new URLSearchParams(searchParams)
    params.set('result', next.join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Wynik:</span>
      {ALL_RESULT_OUTCOMES.map((outcome) => {
        const active = selectedOutcomes.includes(outcome)

        return (
          <button
            key={outcome}
            type="button"
            aria-pressed={active}
            onClick={() => toggleOutcome(outcome)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {resultOutcomeLabels[outcome]}
          </button>
        )
      })}
    </div>
  )
}
