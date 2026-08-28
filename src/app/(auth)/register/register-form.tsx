'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'

import { registerAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PeselDigitInputs } from '@/components/pesel-digit-inputs'

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
  // Zmienia się po każdej nieudanej próbie wysłania formularza - używana jako
  // `key` pól, żeby wymusić ich remount z nowym `defaultValue` (odtworzenie
  // wpisanych wartości) oraz całkowite odświeżenie boxów PESEL (nowy układ,
  // wyczyszczone cyfry).
  const [attempt, setAttempt] = useState(0)
  const [prevState, setPrevState] = useState(state)

  // Aktualizacja podczas renderu (a nie w efekcie) - dzięki temu `attempt`
  // zmienia się w tym samym przebiegu renderu co nowy `defaultValue` z akcji,
  // bez pośredniej klatki z tym samym `key`, ale innym `defaultValue` (co
  // Base UI zgłaszałoby jako błąd).
  if (state !== prevState) {
    setPrevState(state)
    setAttempt((a) => a + 1)
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
          wskazane cyfry Twojego numeru PESEL. Te dane muszą być zgodne z
          protokołem egzaminu.
        </p>

        <p className="text-sm text-muted-foreground">
          Te dane muszą być zgodne z protokołem egzaminu.
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
          <PeselDigitInputs resetToken={attempt} />
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
