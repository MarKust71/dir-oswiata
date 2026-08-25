import { requireUser } from '@/lib/dal'
import { roleLabels } from '@/lib/labels'
import { getResultsVisibleFrom, getResultsVisibleUntil } from '@/lib/settings'
import { notifyMissingResultIfNeeded } from '@/lib/missing-result-notification'
import { Role } from '@/generated/prisma/enums'
import { PeselBoxes } from '@/components/pesel-boxes'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { ApplicationNumberForm } from './application-number-form'

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
  return `Wyniki zostaną udostępnione ${availabilityDateFormatter.format(from)} r. o godz. ${availabilityTimeFormatter.format(from)}.`
}

export default async function PanelPage() {
  const user = await requireUser()

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  const [resultsVisibleFrom, resultsVisibleUntil] =
    user.role === Role.STUDENT
      ? await Promise.all([getResultsVisibleFrom(), getResultsVisibleUntil()])
      : [null, null]

  const now = new Date()
  const isBeforeResultsWindow = Boolean(
    resultsVisibleFrom && now < resultsVisibleFrom
  )
  const isWithinResultsWindow = Boolean(
    resultsVisibleFrom &&
    resultsVisibleUntil &&
    now >= resultsVisibleFrom &&
    now <= resultsVisibleUntil
  )
  const needsApplicationNumberVerification =
    isWithinResultsWindow && user.resultId !== null
  const resultsNotYetAvailable = isWithinResultsWindow && user.resultId === null

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
          {user.phone && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Telefon</span>
              <span className="text-right font-medium">{user.phone}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Rola</span>
            <span className="font-medium">{roleLabels[user.role]}</span>
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
          {isBeforeResultsWindow && resultsVisibleFrom && (
            <>
              <p className="rounded-md bg-muted p-3 text-muted-foreground">
                {formatResultsAvailabilityMessage(resultsVisibleFrom)}
              </p>
              <p
                className={
                  user.resultId !== null
                    ? 'font-medium text-green-600 dark:text-green-400'
                    : 'font-medium text-destructive'
                }
              >
                {user.resultId !== null
                  ? 'Twoje wyniki są dostępne'
                  : 'Twoje wyniki nie są jeszcze dostępne'}
              </p>
            </>
          )}
          {resultsNotYetAvailable && (
            <p className="font-medium text-destructive">
              Twoje wyniki nie są jeszcze dostępne. Powiadomiliśmy o tym
              administratora.
            </p>
          )}
          {needsApplicationNumberVerification && <ApplicationNumberForm />}
        </CardContent>
      </Card>
    </div>
  )
}
