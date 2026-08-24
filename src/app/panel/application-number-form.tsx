'use client'

import { useActionState } from 'react'

import { verifyApplicationNumberAction } from '@/app/actions/verify-application-number'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '@/lib/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Numer wniosku został zweryfikowany.
      </p>
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
