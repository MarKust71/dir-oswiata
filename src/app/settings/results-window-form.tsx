'use client'

import { useActionState, useState } from 'react'

import { updateResultsWindowAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResultsWindowForm({
  initialFrom,
  initialUntil,
}: {
  initialFrom: string
  initialUntil: string
}) {
  const [state, action, pending] = useActionState(
    updateResultsWindowAction,
    undefined
  )
  // Pola sterowane - żeby uniknąć ostrzeżenia Base UI o zmianie defaultValue
  // niekontrolowanego pola po ponownym renderze strony (po udanym zapisie).
  const [from, setFrom] = useState(initialFrom)
  const [until, setUntil] = useState(initialUntil)

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">Udostępnienie od</Label>
        <Input
          id="from"
          name="from"
          type="datetime-local"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="until">Udostępnienie do</Label>
        <Input
          id="until"
          name="until"
          type="datetime-local"
          value={until}
          onChange={(event) => setUntil(event.target.value)}
          required
        />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.message && (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        )}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </div>
    </form>
  )
}
