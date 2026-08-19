'use client'

import { useActionState } from 'react'

import { updateNotificationEmailsAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function NotificationEmailsForm({
  initialEmails,
}: {
  initialEmails: string[]
}) {
  const [state, action, pending] = useActionState(
    updateNotificationEmailsAction,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="emails">Adresy e-mail (po jednym w linii)</Label>
        <Textarea
          id="emails"
          name="emails"
          rows={6}
          placeholder={'jan.kowalski@przyklad.pl\nanna.nowak@przyklad.pl'}
          defaultValue={initialEmails.join('\n')}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.message && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Zapisywanie...' : 'Zapisz'}
      </Button>
    </form>
  )
}
