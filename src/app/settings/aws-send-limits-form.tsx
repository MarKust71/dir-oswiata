'use client'

import { useActionState, useState } from 'react'

import { updateAwsSendLimitsAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AwsSendLimitsForm({
  initialDailySendLimit,
  initialMaxSendRatePerSecond,
}: {
  initialDailySendLimit: string
  initialMaxSendRatePerSecond: string
}) {
  const [state, action, pending] = useActionState(
    updateAwsSendLimitsAction,
    undefined
  )
  // Pola sterowane - żeby uniknąć ostrzeżenia Base UI o zmianie defaultValue
  // niekontrolowanego pola po ponownym renderze strony (po udanym zapisie).
  const [dailySendLimit, setDailySendLimit] = useState(initialDailySendLimit)
  const [maxSendRatePerSecond, setMaxSendRatePerSecond] = useState(
    initialMaxSendRatePerSecond
  )

  return (
    <form action={action} className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dailySendLimit">Dzienny limit wysyłki e-maili</Label>
        <Input
          id="dailySendLimit"
          name="dailySendLimit"
          type="number"
          min={1}
          step={1}
          value={dailySendLimit}
          onChange={(event) => setDailySendLimit(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maxSendRatePerSecond">
          Maksymalne tempo wysyłki (maili/s)
        </Label>
        <Input
          id="maxSendRatePerSecond"
          name="maxSendRatePerSecond"
          type="number"
          min={1}
          step={1}
          value={maxSendRatePerSecond}
          onChange={(event) => setMaxSendRatePerSecond(event.target.value)}
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
