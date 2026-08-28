'use client'

import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { PESEL_LENGTH, pickRandomPeselPositions } from '@/lib/pesel'

// Losowany, edytowalny układ boxów do wprowadzenia wskazanych cyfr numeru
// PESEL - używany przy rejestracji i przy poprawianiu danych konta.
// `resetToken` wymusza nowy, losowy układ i czyszczenie wpisanych wartości
// (np. po nieudanej próbie wysłania formularza).
export function PeselDigitInputs({ resetToken }: { resetToken: number }) {
  // Losowane wyłącznie po stronie klienta - inicjalny stan musi być identyczny
  // na serwerze i kliencie, żeby uniknąć błędu hydracji.
  const [peselPositions, setPeselPositions] = useState<number[]>([])
  const peselInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [prevResetToken, setPrevResetToken] = useState(resetToken)

  useEffect(() => {
    // Celowo: to jedyny sposób na wylosowanie pozycji po stronie klienta bez
    // rozjazdu SSR/hydracji (losowość nie może wystąpić podczas renderu).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeselPositions(pickRandomPeselPositions())
  }, [])

  // Aktualizacja podczas renderu (a nie w efekcie) - dzięki temu `resetToken`
  // i nowy układ PESEL zmieniają się w tym samym przebiegu renderu co nowy
  // `defaultValue` z akcji, bez pośredniej klatki z tym samym `key`, ale innym
  // `defaultValue` (co Base UI zgłaszałoby jako błąd).
  if (resetToken !== prevResetToken) {
    setPrevResetToken(resetToken)
    setPeselPositions(pickRandomPeselPositions())
  }

  return (
    <div className="flex flex-nowrap gap-0.5 sm:gap-1">
      {Array.from({ length: PESEL_LENGTH }, (_, i) => {
        const isActive = peselPositions.includes(i)

        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-muted-foreground">{i + 1}</span>
            {isActive ? (
              <>
                <input type="hidden" name="peselPositions" value={i} />
                <Input
                  key={resetToken}
                  ref={(el) => {
                    peselInputRefs.current[i] = el
                  }}
                  name={`peselDigit-${i}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  autoComplete="off"
                  required
                  className="h-9 w-6 px-0 text-center tabular-nums"
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/[^0-9]/g, '')
                      .slice(0, 1)
                    e.target.value = value

                    if (value) {
                      const currentIndex = peselPositions.indexOf(i)
                      const nextPosition =
                        peselPositions[
                          (currentIndex + 1) % peselPositions.length
                        ]
                      peselInputRefs.current[nextPosition]?.select()
                    }
                  }}
                />
              </>
            ) : (
              <div
                aria-hidden
                className="flex h-9 w-6 items-center justify-center rounded-lg border border-input bg-input/30 text-muted-foreground"
              >
                •
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
