'use client'

import { useActionState, useState } from 'react'

import { updateEventLogRetentionAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EventLogRetentionForm({
  initialDays,
}: {
  initialDays: string
}) {
  const [state, action, pending] = useActionState(
    updateEventLogRetentionAction,
    undefined
  )
  // Pole sterowane - żeby uniknąć ostrzeżenia Base UI o zmianie defaultValue
  // niekontrolowanego pola po ponownym renderze strony (po udanym zapisie).
  const [days, setDays] = useState(initialDays)

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retentionDays">
          Przechowuj wpisy dziennika przez (w dniach)
        </Label>
        <Input
          id="retentionDays"
          name="retentionDays"
          type="number"
          min={1}
          step={1}
          value={days}
          onChange={(event) => setDays(event.target.value)}
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
