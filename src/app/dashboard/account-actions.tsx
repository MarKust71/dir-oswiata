'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  deleteAccountAction,
  setAccountRoleAction,
  setAccountStatusAction,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { roleLabels } from '@/lib/labels'
import { AccountStatus, Role } from '@/generated/prisma/enums'

type AccountActionsProps = {
  userId: string
  email: string
  role: Role
  status: AccountStatus
  canManage: boolean
  canDelete: boolean
  // Rola USER nie może aktywować z pominięciem linku aktywacyjnego konta
  // ucznia, dla którego nie znaleziono jeszcze wyniku (zob.
  // setAccountStatusAction) - kontrolka jest wtedy widoczna, ale wyłączona.
  disableActivateFromPendingEmail?: boolean
  // Jeśli konto już wcześniej wyświetliło swój wynik (resultsViewCount > 0),
  // ponowna aktywacja daje mu świeży komplet prób - wymaga dodatkowego
  // potwierdzenia.
  resultsViewCount?: number
  assignableRoles: Role[]
  // "compact" ustawia kontrolki jedna pod druga, żeby nie poszerzać kolumny
  // w tabeli desktopowej; "wide" (domyślnie) układa je obok siebie - używane
  // w szerszych kartach mobilnych.
  layout?: 'compact' | 'wide'
}

export function AccountActions({
  userId,
  email,
  role,
  status,
  canManage,
  canDelete,
  disableActivateFromPendingEmail = false,
  resultsViewCount = 0,
  assignableRoles,
  layout = 'wide',
}: AccountActionsProps) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false)

  function handleStatus(
    next: typeof AccountStatus.ACTIVE | typeof AccountStatus.DISABLED
  ) {
    startTransition(async () => {
      const res = await setAccountStatusAction(userId, next)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  function handleActivateClick() {
    if (resultsViewCount > 0) {
      setActivateConfirmOpen(true)
    } else {
      handleStatus(AccountStatus.ACTIVE)
    }
  }

  function handleActivateConfirm() {
    setActivateConfirmOpen(false)
    handleStatus(AccountStatus.ACTIVE)
  }

  function handleRole(next: Role | null) {
    if (!next) return
    startTransition(async () => {
      const res = await setAccountRoleAction(userId, next)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  function handleDelete() {
    setConfirmOpen(false)
    startTransition(async () => {
      const res = await deleteAccountAction(userId)
      if (res?.error) toast.error(res.error)
      else if (res?.message) toast.success(res.message)
    })
  }

  if (!canManage) {
    return <span className="text-sm text-muted-foreground">Niedostępne</span>
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2',
          layout === 'compact' ? 'flex-col items-start' : 'flex-wrap'
        )}
      >
        {assignableRoles.length > 0 && (
          <Select value={role} onValueChange={handleRole} disabled={pending}>
            <SelectTrigger
              size="sm"
              className={layout === 'compact' ? 'w-28' : 'w-32'}
            >
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
        )}

        {status === AccountStatus.PENDING_EMAIL && (
          <Button
            size="sm"
            disabled={pending || disableActivateFromPendingEmail}
            title={
              disableActivateFromPendingEmail
                ? 'Brak wyniku dla tego konta - aktywację z pominięciem linku może wykonać tylko administrator.'
                : undefined
            }
            onClick={handleActivateClick}
          >
            Aktywuj
          </Button>
        )}
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
          <Button size="sm" disabled={pending} onClick={handleActivateClick}>
            Aktywuj
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            Usuń
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunięcie konta</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć rekord użytkownika {email}? Operacja
              jest nieodwracalna, ale będzie można ponownie zarejestrować konto
              z tym samym loginem - adresem e-mail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={activateConfirmOpen}
        onOpenChange={setActivateConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ponowna aktywacja konta</AlertDialogTitle>
            <AlertDialogDescription>
              Wyniki tej osoby zostały już odczytane. Czy na pewno aktywować jej
              konto ponownie?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateConfirm}>
              Aktywuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
