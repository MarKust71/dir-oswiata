'use client'

import { useActionState, useState } from 'react'

import { updateResultsLimitsAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResultsLimitsForm({
  initialMaxApplicationNumberAttempts,
  initialMaxResultsViewCount,
}: {
  initialMaxApplicationNumberAttempts: string
  initialMaxResultsViewCount: string
}) {
  const [state, action, pending] = useActionState(
    updateResultsLimitsAction,
    undefined
  )
  // Pola sterowane - żeby uniknąć ostrzeżenia Base UI o zmianie defaultValue
  // niekontrolowanego pola po ponownym renderze strony (po udanym zapisie).
  const [maxApplicationNumberAttempts, setMaxApplicationNumberAttempts] =
    useState(initialMaxApplicationNumberAttempts)
  const [maxResultsViewCount, setMaxResultsViewCount] = useState(
    initialMaxResultsViewCount
  )

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maxApplicationNumberAttempts">
          Maksymalna liczba prób podania numeru wniosku
        </Label>
        <Input
          id="maxApplicationNumberAttempts"
          name="maxApplicationNumberAttempts"
          type="number"
          min={1}
          step={1}
          value={maxApplicationNumberAttempts}
          onChange={(event) =>
            setMaxApplicationNumberAttempts(event.target.value)
          }
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maxResultsViewCount">
          Maksymalna liczba wyświetleń wyników
        </Label>
        <Input
          id="maxResultsViewCount"
          name="maxResultsViewCount"
          type="number"
          min={1}
          step={1}
          value={maxResultsViewCount}
          onChange={(event) => setMaxResultsViewCount(event.target.value)}
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
