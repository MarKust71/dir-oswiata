import Link from 'next/link'

import { requireRole } from '@/lib/dal'
import {
  getAwsDailySendLimit,
  getAwsMaxSendRatePerSecond,
  getEventLogPageSize,
  getEventLogRetentionDays,
  getInactivityTimeoutSeconds,
  getInactivityTimeoutStudentsOnly,
  getMaintenanceMode,
  getMaxApplicationNumberAttempts,
  getMaxResultsViewCount,
  getNotificationEmails,
  getResultsVisibleFrom,
  getResultsVisibleUntil,
  getSkipEmailVerification,
} from '@/lib/settings'
import { toWarsawLocalDateTimeInputValue } from '@/lib/warsaw-time'
import { Role } from '@/generated/prisma/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'

import { NotificationEmailsForm } from './notification-emails-form'
import { ImportResultsForm } from './import-results-form'
import { ResultsWindowForm } from './results-window-form'
import { ResultsLimitsForm } from './results-limits-form'
import { RelinkResultsForm } from './relink-results-form'
import { InactivityTimeoutForm } from './inactivity-timeout-form'
import { InactivityTimeoutStudentsOnlyForm } from './inactivity-timeout-students-only-form'
import { BackupForm } from './backup-form'
import { MaintenanceModeForm } from './maintenance-mode-form'
import { SkipEmailVerificationForm } from './skip-email-verification-form'
import { EventLogRetentionForm } from './event-log-retention-form'
import { EventLogPageSizeForm } from './event-log-page-size-form'
import { AwsSendLimitsForm } from './aws-send-limits-form'

export default async function SettingsPage() {
  await requireRole([Role.ADMIN])

  const emails = await getNotificationEmails()
  const [
    resultsVisibleFrom,
    resultsVisibleUntil,
    maxApplicationNumberAttempts,
    maxResultsViewCount,
    inactivityTimeoutSeconds,
    inactivityTimeoutStudentsOnly,
    maintenanceModeEnabled,
    skipEmailVerificationEnabled,
    eventLogRetentionDays,
    eventLogPageSize,
    awsDailySendLimit,
    awsMaxSendRatePerSecond,
  ] = await Promise.all([
    getResultsVisibleFrom(),
    getResultsVisibleUntil(),
    getMaxApplicationNumberAttempts(),
    getMaxResultsViewCount(),
    getInactivityTimeoutSeconds(),
    getInactivityTimeoutStudentsOnly(),
    getMaintenanceMode(),
    getSkipEmailVerification(),
    getEventLogRetentionDays(),
    getEventLogPageSize(),
    getAwsDailySendLimit(),
    getAwsMaxSendRatePerSecond(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">
          Konfiguracja globalnych ustawień aplikacji.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Adresy e-mail do powiadomień
            </CardTitle>
            <CardDescription>
              Po każdym potwierdzeniu adresu e-mail przez nowego użytkownika, na
              poniższe adresy zostanie wysłane powiadomienie o oczekującym na
              akceptację koncie.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <NotificationEmailsForm initialEmails={emails} />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Okres udostępnienia wyników
            </CardTitle>
            <CardDescription>
              Studenci zobaczą swoje wyniki dopiero po nadejściu daty
              początkowej. Wartości podawane są w czasie lokalnym Warszawy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ResultsWindowForm
              initialFrom={
                resultsVisibleFrom
                  ? toWarsawLocalDateTimeInputValue(resultsVisibleFrom)
                  : ''
              }
              initialUntil={
                resultsVisibleUntil
                  ? toWarsawLocalDateTimeInputValue(resultsVisibleUntil)
                  : ''
              }
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Limity weryfikacji numeru wniosku
            </CardTitle>
            <CardDescription>
              Po przekroczeniu któregokolwiek z limitów konto studenta zostaje
              zablokowane.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ResultsLimitsForm
              initialMaxApplicationNumberAttempts={String(
                maxApplicationNumberAttempts
              )}
              initialMaxResultsViewCount={String(maxResultsViewCount)}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Import wyników egzaminów
            </CardTitle>
            <CardDescription>
              Wgraj plik .xlsx z wynikami. Pierwszy wiersz arkusza musi zawierać
              nagłówki: Praktyka, Teoria, Końcowa, Ocena ustna, Ocena pisemna,
              zawód, Imię, Nazwisko, Pesel, Nr wniosku.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ImportResultsForm />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Dopasowywanie kont do wyników
            </CardTitle>
            <CardDescription>
              Ponownie spróbuj powiązać konta uczniów bez przypisanego wyniku z
              rekordami w tabeli wyników (po imieniu, nazwisku i numerze PESEL).
              Ta operacja jest wykonywana automatycznie przy aktywacji konta i
              po imporcie wyników - użyj tego przycisku, aby uruchomić ją
              ręcznie.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <RelinkResultsForm />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Automatyczne wylogowanie
            </CardTitle>
            <CardDescription>
              Po tym czasie braku aktywności użytkownik zostanie automatycznie
              wylogowany ze względów bezpieczeństwa. Opcja &quot;Tylko
              studenci&quot; ogranicza to działanie wyłącznie do kont ze
              statusem studenta - Pracownicy i Administratorzy nie będą
              automatycznie wylogowywani.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <InactivityTimeoutForm
              initialSeconds={String(inactivityTimeoutSeconds)}
            />
            <Separator />
            <InactivityTimeoutStudentsOnlyForm
              initialEnabled={inactivityTimeoutStudentsOnly}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              Kopia zapasowa bazy danych
            </CardTitle>
            <CardDescription>
              Pobierz plik z zawartością wszystkich tabel lub przywróć je z
              wcześniej pobranego pliku. Przywrócenie zastępuje całą bieżącą
              zawartość bazy danych.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <BackupForm />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Przełączniki</CardTitle>
            <CardDescription>
              Globalne opcje włączane i wyłączane jednym przełącznikiem.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Przerwa konserwacyjna</p>
              <p className="text-sm text-muted-foreground">
                Po włączeniu konta o roli Student nie mogą się zalogować, a na
                stronie logowania oraz stronie głównej ukrywane są skróty do
                rejestracji.
              </p>
              <MaintenanceModeForm initialEnabled={maintenanceModeEnabled} />
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Pomijanie weryfikacji e-mail
              </p>
              <p className="text-sm text-muted-foreground">
                Po włączeniu nowo zarejestrowane konta pomijają potwierdzenie
                adresu e-mail linkiem aktywacyjnym i trafiają od razu do stanu
                oczekującego na akceptację administratora/pracownika.
              </p>
              <SkipEmailVerificationForm
                initialEnabled={skipEmailVerificationEnabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Dziennik zdarzeń</CardTitle>
            <CardDescription>
              Trwały zapis zdarzeń aplikacji (rejestracje, logowania, zmiany
              statusów kont, wysyłki e-maili) - niezależny od dostarczalności
              poczty i od ulotnych logów serwera. Adres IP i przeglądarka to
              dane osobowe, dlatego stare wpisy są automatycznie usuwane.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <Link
              href="/logs"
              className={buttonVariants({ variant: 'outline' })}
            >
              Zobacz dziennik zdarzeń
            </Link>

            <Separator />

            <EventLogRetentionForm
              initialDays={String(eventLogRetentionDays)}
            />

            <Separator />

            <EventLogPageSizeForm initialPageSize={String(eventLogPageSize)} />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Limity wysyłki AWS SES</CardTitle>
            <CardDescription>
              Chronią przed odrzuceniem/zablokowaniem konta wysyłkowego -
              sprawdź aktualne wartości w konsoli AWS SES (Account dashboard
              -&gt; Sending limits) i ustaw je tutaj z niewielkim zapasem.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <AwsSendLimitsForm
              initialDailySendLimit={String(awsDailySendLimit)}
              initialMaxSendRatePerSecond={String(awsMaxSendRatePerSecond)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
