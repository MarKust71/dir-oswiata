'use client'

import { useActionState, useState } from 'react'
import { PencilIcon } from 'lucide-react'

import { updateProfileAction } from '@/app/actions/profile'
import { PeselDigitInputs } from '@/components/pesel-digit-inputs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EditProfileDialog({
  firstName,
  lastName,
  phone,
}: {
  firstName: string | null
  lastName: string | null
  phone: string | null
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    undefined
  )
  // Zmienia się po każdej nieudanej próbie wysłania formularza - używana jako
  // `key` pól, żeby wymusić ich remount z nowym `defaultValue` (odtworzenie
  // wpisanych wartości) oraz odświeżenie boxów PESEL (nowy układ, wyczyszczone
  // cyfry). Udany zapis nie zwraca stanu - przekierowuje od razu na stronę
  // logowania (zob. src/app/actions/profile.ts).
  const [attempt, setAttempt] = useState(0)
  const [prevState, setPrevState] = useState(state)

  if (state !== prevState) {
    setPrevState(state)
    setAttempt((a) => a + 1)
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Edytuj dane konta</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Popraw dane konta</DialogTitle>
          <DialogDescription>
            Popraw imię, nazwisko, telefon lub cyfry numeru PESEL, jeśli różnią
            się od danych z protokołu egzaminu. Po zapisaniu danych zostaniesz
            wylogowany, a konto będzie wymagać ponownej aktywacji przez
            administratora.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-firstName">Imię</Label>
            <Input
              key={attempt}
              id="edit-firstName"
              name="firstName"
              autoComplete="given-name"
              defaultValue={state?.values?.firstName ?? firstName ?? ''}
              required
            />
            {state?.errors?.firstName && (
              <p className="text-sm text-destructive">
                {state.errors.firstName[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lastName">Nazwisko</Label>
            <Input
              key={attempt}
              id="edit-lastName"
              name="lastName"
              autoComplete="family-name"
              defaultValue={state?.values?.lastName ?? lastName ?? ''}
              required
            />
            {state?.errors?.lastName && (
              <p className="text-sm text-destructive">
                {state.errors.lastName[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-phone">Telefon</Label>
            <Input
              key={attempt}
              id="edit-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="np. +48123456789"
              defaultValue={state?.values?.phone ?? phone ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                const hasPlus = raw.startsWith('+')
                const digits = raw.replace(/[^0-9]/g, '').slice(0, 11)
                e.target.value = (hasPlus ? '+' : '') + digits
              }}
            />
            {state?.errors?.phone && (
              <p className="text-sm text-destructive">
                {state.errors.phone[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Numer PESEL - wskazane cyfry</Label>
            <PeselDigitInputs resetToken={attempt} />
            {state?.errors?.peselDigits && (
              <p className="text-sm text-destructive">
                {state.errors.peselDigits[0]}
              </p>
            )}
          </div>

          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
