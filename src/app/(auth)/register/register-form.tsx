'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { registerAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PESEL_LENGTH, pickRandomPeselPositions } from '@/lib/pesel'

function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      {' '}
      *
    </span>
  )
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined)
  // Losowane wyłącznie po stronie klienta - inicjalny stan musi być identyczny
  // na serwerze i kliencie, żeby uniknąć błędu hydracji.
  const [peselPositions, setPeselPositions] = useState<number[]>([])
  const peselInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  // Zmienia sie po kazdej nieudanej probie wyslania formularza - uzywana jako
  // `key` pol, zeby wymusic ich remount z nowym `defaultValue` (odtworzenie
  // wpisanych wartosci) oraz calkowite odswiezenie boxow PESEL (nowy uklad,
  // wyczyszczone cyfry).
  const [attempt, setAttempt] = useState(0)
  const [prevState, setPrevState] = useState(state)

  useEffect(() => {
    // Celowo: to jedyny sposob na wylosowanie pozycji po stronie klienta bez
    // rozjazdu SSR/hydracji (losowosc nie moze wystapic podczas renderu).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeselPositions(pickRandomPeselPositions())
  }, [])

  // Aktualizacja podczas renderu (a nie w efekcie) - dzieki temu `attempt` i
  // nowy uklad PESEL zmieniaja sie w tym samym przebiegu renderu co nowy
  // `defaultValue` z akcji, bez posredniej klatki z tym samym `key`, ale innym
  // `defaultValue` (co Base UI zglaszaloby jako blad).
  if (state !== prevState) {
    setPrevState(state)
    setAttempt((a) => a + 1)
    setPeselPositions(pickRandomPeselPositions())
  }

  if (state?.success) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm text-foreground">{state.message}</p>
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Wróć do logowania
        </Link>
      </div>
    )
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-x-8"
    >
      {/* Lewa kolumna (desktop): dane logowania */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Adres e-mail
            <RequiredMark />
          </Label>
          <Input
            key={attempt}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="np. jan.kowalski@przyklad.pl"
            defaultValue={state?.values?.email}
            required
          />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Hasło
            <RequiredMark />
          </Label>
          <Input
            key={attempt}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            defaultValue={state?.values?.password}
            required
          />
          {state?.errors?.password && (
            <ul className="list-inside list-disc text-sm text-destructive">
              {state.errors.password.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">
            Powtorz haslo
            <RequiredMark />
          </Label>
          <Input
            key={attempt}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            defaultValue={state?.values?.confirmPassword}
            required
          />
          {state?.errors?.confirmPassword && (
            <p className="text-sm text-destructive">
              {state.errors.confirmPassword[0]}
            </p>
          )}
        </div>
      </div>

      {/* Prawa kolumna (desktop): weryfikacja tozsamosci i kontakt */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Dla weryfikacji Twojej tożsamości wprowadź imię, nazwisko oraz
          wskazane cyfry Twojego numeru PESEL.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">
            Imię
            <RequiredMark />
          </Label>
          <Input
            key={attempt}
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            defaultValue={state?.values?.firstName}
            required
          />
          {state?.errors?.firstName && (
            <p className="text-sm text-destructive">
              {state.errors.firstName[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">
            Nazwisko
            <RequiredMark />
          </Label>
          <Input
            key={attempt}
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            defaultValue={state?.values?.lastName}
            required
          />
          {state?.errors?.lastName && (
            <p className="text-sm text-destructive">
              {state.errors.lastName[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Numer PESEL - wskazane cyfry
            <RequiredMark />
          </Label>
          <div className="flex flex-nowrap gap-0.5 sm:gap-1">
            {Array.from({ length: PESEL_LENGTH }, (_, i) => {
              const isActive = peselPositions.includes(i)

              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-muted-foreground">
                    {i + 1}
                  </span>
                  {isActive ? (
                    <>
                      <input type="hidden" name="peselPositions" value={i} />
                      <Input
                        key={attempt}
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
          {state?.errors?.peselDigits && (
            <p className="text-sm text-destructive">
              {state.errors.peselDigits[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
            Jeśli wystąpią wątpliwości, a zależy Ci na szybszym kontakcie,
            zostaw numer telefonu.
          </p>
          <Input
            key={attempt}
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="np. +48123456789"
            defaultValue={state?.values?.phone}
            onChange={(e) => {
              const raw = e.target.value
              const hasPlus = raw.startsWith('+')
              const digits = raw.replace(/[^0-9]/g, '').slice(0, 11)
              e.target.value = (hasPlus ? '+' : '') + digits
            }}
          />
          {state?.errors?.phone && (
            <p className="text-sm text-destructive">{state.errors.phone[0]}</p>
          )}
        </div>
      </div>

      {/* Na calej szerokosci, pod obiema kolumnami */}
      <div className="flex flex-col gap-4 md:col-span-2">
        {state?.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <p className="text-xs text-muted-foreground">
          * - pole musi zostać wypełnione
        </p>

        <Button type="submit" disabled={pending} className="h-10 w-full">
          {pending ? 'Tworzenie konta...' : 'Zarejestruj się'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Masz już konto?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </form>
  )
}
