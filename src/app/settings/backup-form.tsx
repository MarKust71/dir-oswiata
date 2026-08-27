'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { restoreBackupAction } from '@/app/actions/backup'
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
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function BackupForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (
      prevState: Awaited<ReturnType<typeof restoreBackupAction>>,
      formData: FormData
    ) => {
      const result = await restoreBackupAction(prevState, formData)
      if (!result?.error) formRef.current?.reset()

      return result
    },
    undefined
  )

  useEffect(() => {
    if (state?.error) toast.error(state.error)
    else if (state?.message) toast.success(state.message)
  }, [state])

  function handleTriggerClick() {
    // Wykorzystujemy natywną walidację `required` na inpucie pliku, zanim
    // w ogóle otworzymy dialog z potwierdzeniem.
    if (!formRef.current?.reportValidity()) return
    setConfirmOpen(true)
  }

  function handleConfirm() {
    setConfirmOpen(false)
    formRef.current?.requestSubmit()
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Kopia zapasowa</span>
          <a
            href="/api/backup"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-fit'
            )}
          >
            Pobierz kopię zapasową
          </a>
        </div>

        <form
          ref={formRef}
          action={action}
          className="flex flex-1 flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backupFile">Przywróć z pliku (.json)</Label>
            <Input
              id="backupFile"
              name="file"
              type="file"
              accept=".json,application/json"
              required
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={handleTriggerClick}
            disabled={pending}
            className="mt-auto w-fit"
          >
            {pending ? 'Przywracanie...' : 'Przywróć'}
          </Button>
        </form>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Przywrócić kopię zapasową?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja trwale usunie wszystkie obecne dane (konta, wyniki,
              ustawienia) i zastąpi je zawartością wybranego pliku. Operacja
              jest nieodwracalna. Czy na pewno chcesz kontynuować?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Przywróć
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
