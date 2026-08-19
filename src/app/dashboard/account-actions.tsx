'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import {
  setAccountRoleAction,
  setAccountStatusAction,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roleLabels } from '@/lib/labels'
import { AccountStatus, Role } from '@/generated/prisma/enums'

type AccountActionsProps = {
  userId: string
  role: Role
  status: AccountStatus
  canManage: boolean
  assignableRoles: Role[]
}

export function AccountActions({
  userId,
  role,
  status,
  canManage,
  assignableRoles,
}: AccountActionsProps) {
  const [pending, startTransition] = useTransition()

  function handleStatus(
    next: typeof AccountStatus.ACTIVE | typeof AccountStatus.DISABLED
  ) {
    startTransition(async () => {
      const res = await setAccountStatusAction(userId, next)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  function handleRole(next: Role | null) {
    if (!next) return
    startTransition(async () => {
      const res = await setAccountRoleAction(userId, next)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  if (!canManage) {
    return <span className="text-sm text-muted-foreground">Brak uprawnien</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={role} onValueChange={handleRole} disabled={pending}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assignableRoles.map((r) => (
            <SelectItem key={r} value={r}>
              {roleLabels[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {status === AccountStatus.PENDING_APPROVAL && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => handleStatus(AccountStatus.ACTIVE)}
        >
          Zatwierdz
        </Button>
      )}
      {status === AccountStatus.ACTIVE && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => handleStatus(AccountStatus.DISABLED)}
        >
          Dezaktywuj
        </Button>
      )}
      {status === AccountStatus.DISABLED && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => handleStatus(AccountStatus.ACTIVE)}
        >
          Aktywuj
        </Button>
      )}
    </div>
  )
}
