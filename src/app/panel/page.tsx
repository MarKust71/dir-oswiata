import { requireUser } from '@/lib/dal'
import {
  getResultsVisibleFrom,
  getResultsVisibleUntil,
  getResultsWindowLockEnabled,
} from '@/lib/settings'
import { notifyMissingResultIfNeeded } from '@/lib/missing-result-notification'
import { tryLinkUserToResult } from '@/lib/results-matching'
import { Role } from '@/generated/prisma/enums'
import { PeselBoxes } from '@/components/pesel-boxes'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { ApplicationNumberForm } from './application-number-form'
import { EditProfileDialog } from './edit-profile-dialog'

const availabilityDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Warsaw',
})

const availabilityTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Warsaw',
})

function formatResultsAvailabilityMessage(from: Date) {
  return `Wyniki zostaną udostępnione ${availabilityDateFormatter.format(from)} r. o godz. ${availabilityTimeFormatter.format(from)}.`
}

export default async function PanelPage() {
  const user = await requireUser()

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  // Dane mogły zostać właśnie poprawione w panelu (zob. edit-profile-dialog.tsx) -
  // dopiero po ich zapisaniu i pokazaniu w panelu sprawdzamy, czy na ich
  // podstawie można teraz powiązać konto z wynikiem egzaminu.
  let hasResult = user.resultId !== null
  if (user.role === Role.STUDENT && !hasResult) {
    hasResult = await tryLinkUserToResult({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      peselPositions: user.peselPositions,
      peselDigits: user.peselDigits,
    })
  }

  const [resultsVisibleFrom, resultsVisibleUntil, resultsWindowLockEnabled] =
    user.role === Role.STUDENT
      ? await Promise.all([
          getResultsVisibleFrom(),
          getResultsVisibleUntil(),
          getResultsWindowLockEnabled(),
        ])
      : [null, null, false]

  const now = new Date()
  const isBeforeResultsWindow = Boolean(
    resultsVisibleFrom && now < resultsVisibleFrom
  )
  // Gdy przełącznik "Wygaszanie po dacie końcowej" (results_window_lock_enabled,
  // Ustawienia) jest wyłączony, upływ resultsVisibleUntil nie zamyka już okna -
  // wyniki pozostają dostępne bezterminowo po dacie początkowej. Gdy jest
  // włączony, po dacie końcowej okno się zamyka i pokazujemy osobny komunikat
  // (zob. resultsWindowLockActive poniżej) zamiast cichego braku dostępu.
  const resultsWindowLockActive = Boolean(
    resultsWindowLockEnabled && resultsVisibleUntil && now > resultsVisibleUntil
  )
  const isWithinResultsWindow = Boolean(
    resultsVisibleFrom &&
    resultsVisibleUntil &&
    now >= resultsVisibleFrom &&
    !resultsWindowLockActive
  )
  const needsApplicationNumberVerification = isWithinResultsWindow && hasResult
  const resultsNotYetAvailable = isWithinResultsWindow && !hasResult
  const canEditProfile = user.role === Role.STUDENT && !hasResult

  if (resultsNotYetAvailable) {
    await notifyMissingResultIfNeeded({
      id: user.id,
      email: user.email,
      missingResultNotifiedAt: user.missingResultNotifiedAt,
    })
  }

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Witaj{fullName ? `, ${fullName}` : ''}!
          </CardTitle>
          <CardDescription>Twoje konto</CardDescription>
          {canEditProfile && (
            <CardAction>
              <EditProfileDialog
                firstName={user.firstName}
                lastName={user.lastName}
                phone={user.phone}
              />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">E-mail</span>
            <span className="break-all text-right font-medium">
              {user.email}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Imię i nazwisko</span>
            <span className="text-right font-medium">{fullName || '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Telefon</span>
            <span className="text-right font-medium">
              {user.phone || '(nie podano)'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">
              Numer PESEL - wskazane cyfry
            </span>
            <PeselBoxes
              positions={user.peselPositions}
              digits={user.peselDigits}
            />
          </div>
          {resultsWindowLockActive && (
            <p className="font-medium text-destructive">
              Możliwość sprawdzenia wyniku egzaminu została wyłączona.
            </p>
          )}
          {isBeforeResultsWindow && resultsVisibleFrom && (
            <>
              <p className="rounded-md bg-muted p-3 text-muted-foreground">
                {formatResultsAvailabilityMessage(resultsVisibleFrom)}
              </p>
              {hasResult ? (
                <p className="font-medium text-green-600 dark:text-green-400">
                  Twoje wyniki czekają na udostępnienie
                </p>
              ) : (
                <>
                  <p className="font-medium text-destructive">
                    Twoje wyniki nie są jeszcze dostępne.
                  </p>
                  <p className="font-medium text-destructive">
                    Powodem mogą być różnice w imieniu lub nazwisko w stosunku
                    do protokołu egzaminu lub błędnie podane cyfry numeru PESEL.
                  </p>
                </>
              )}
            </>
          )}
          {resultsNotYetAvailable && (
            <>
              <p className="font-medium text-destructive">
                Twoje wyniki nie są jeszcze dostępne.
              </p>
              <p className="font-medium text-destructive">
                Powodem mogą być różnice w imieniu lub nazwisko w stosunku do
                protokołu egzaminu lub błędnie podane cyfry numeru PESEL.{' '}
              </p>
              <p className="font-medium text-destructive">
                Powiadomiliśmy o tym administratora.
              </p>
            </>
          )}
          {needsApplicationNumberVerification && <ApplicationNumberForm />}
        </CardContent>
      </Card>
    </div>
  )
}
