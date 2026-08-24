'use client'

import { useActionState } from 'react'

import { verifyApplicationNumberAction } from '@/app/actions/verify-application-number'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '@/lib/contact'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function DetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function ApplicationNumberForm() {
  const [state, action, pending] = useActionState(
    verifyApplicationNumberAction,
    undefined
  )

  if (state?.status === 'locked') {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        <p>{state.message}</p>
        <p>
          {CONTACT_EMAIL}, {CONTACT_PHONE_DISPLAY}
        </p>
      </div>
    )
  }

  if (state?.status === 'success') {
    const { result } = state
    const positive = result.finalScore > 2

    return (
      <div className="flex flex-col gap-3 rounded-md border p-3 text-sm">
        <span
          className={cn(
            'text-lg font-semibold',
            positive ? 'text-green-600 dark:text-green-400' : 'text-destructive'
          )}
        >
          {positive ? 'POZYTYWNY' : 'NEGATYWNY'}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="block">
            {result.lastName}, {result.firstName}
          </span>
          <span className="block font-mono">{result.pesel}</span>
          <span className="block text-muted-foreground">
            {result.profession} · nr wniosku {result.applicationNumber}
          </span>
        </div>
        <div className="flex flex-col">
          <DetailRow label="Ocena ustna" value={result.oralScore} />
          <DetailRow label="Ocena pisemna" value={result.writtenScore} />
          <DetailRow label="Wynik teoretyczny" value={result.theoryScore} />
          <DetailRow label="Wynik praktyczny" value={result.practicalScore} />
          <DetailRow label="Wynik końcowy" value={result.finalScore} />
        </div>
        {state.accountLocked && (
          <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
            <p>
              Wykorzystałeś limit prawidłowych wyświetleń swoich wyników. Twoje
              konto zostało zablokowane.
            </p>
            <p>
              {CONTACT_EMAIL}, {CONTACT_PHONE_DISPLAY}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="applicationNumber">
          Podaj numer wniosku, aby zobaczyć wyniki
        </Label>
        <Input
          id="applicationNumber"
          name="applicationNumber"
          placeholder="np. 123/2026"
          required
        />
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-destructive">
          {state.message}
          {typeof state.attemptsRemaining === 'number' &&
            ` Pozostało prób: ${state.attemptsRemaining}.`}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Sprawdzanie...' : 'Zweryfikuj'}
      </Button>
    </form>
  )
}
