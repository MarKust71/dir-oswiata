'use client'

import { useState, useTransition } from 'react'

import { updateInactivityTimeoutStudentsOnlyAction } from '@/app/actions/settings'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function InactivityTimeoutStudentsOnlyForm({
  initialEnabled,
}: {
  initialEnabled: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleCheckedChange(checked: boolean) {
    setEnabled(checked)
    setError(null)

    startTransition(async () => {
      const result = await updateInactivityTimeoutStudentsOnlyAction(checked)
      if (result?.error) {
        setEnabled(!checked)
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Switch
          id="inactivity-timeout-students-only"
          checked={enabled}
          onCheckedChange={handleCheckedChange}
          disabled={pending}
        />
        <Label htmlFor="inactivity-timeout-students-only">Tylko studenci</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
