'use client'

import { useActionState } from 'react'

import { relinkResultsAction } from '@/app/actions/results'
import { Button } from '@/components/ui/button'

export function RelinkResultsForm() {
  const [state, action, pending] = useActionState(
    relinkResultsAction,
    undefined
  )

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="mt-auto flex flex-col gap-3">
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.message && (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        )}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? 'Dopasowywanie...' : 'Uruchom dopasowywanie'}
        </Button>
      </div>
    </form>
  )
}
