'use client'

import { useActionState, useState } from 'react'

import { updateEventLogPageSizeAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EventLogPageSizeForm({
  initialPageSize,
}: {
  initialPageSize: string
}) {
  const [state, action, pending] = useActionState(
    updateEventLogPageSizeAction,
    undefined
  )
  // Pole sterowane - żeby uniknąć ostrzeżenia Base UI o zmianie defaultValue
  // niekontrolowanego pola po ponownym renderze strony (po udanym zapisie).
  const [pageSize, setPageSize] = useState(initialPageSize)

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pageSize">Liczba rekordów na stronie</Label>
        <Input
          id="pageSize"
          name="pageSize"
          type="number"
          min={1}
          step={1}
          value={pageSize}
          onChange={(event) => setPageSize(event.target.value)}
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
