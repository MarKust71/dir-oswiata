'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { importResultsAction } from '@/app/actions/results'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ImportResultsForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (
      prevState: Awaited<ReturnType<typeof importResultsAction>>,
      formData: FormData
    ) => {
      const result = await importResultsAction(prevState, formData)
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
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Plik z wynikami (.xlsx)</Label>
          <Input id="file" name="file" type="file" accept=".xlsx" required />
        </div>

        <Button
          type="button"
          onClick={handleTriggerClick}
          disabled={pending}
          className="w-fit"
        >
          {pending ? 'Importowanie...' : 'Importuj'}
        </Button>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zastąpić poprzednie wyniki?</AlertDialogTitle>
            <AlertDialogDescription>
              Ponowne wczytanie danych spowoduje najpierw usunięcie wszystkich
              poprzednich informacji o wynikach. Czy chcesz kontynuować?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
