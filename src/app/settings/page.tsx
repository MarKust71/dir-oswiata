import { requireRole } from '@/lib/dal'
import { getNotificationEmails } from '@/lib/settings'
import { Role } from '@/generated/prisma/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { NotificationEmailsForm } from './notification-emails-form'
import { ImportResultsForm } from './import-results-form'

export default async function SettingsPage() {
  await requireRole([Role.ADMIN])

  const emails = await getNotificationEmails()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">
          Konfiguracja globalnych ustawień aplikacji.
        </p>
      </div>

      <Card className="max-w-lg">
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
        <CardContent>
          <NotificationEmailsForm initialEmails={emails} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Import wyników egzaminów</CardTitle>
          <CardDescription>
            Wgraj plik .xlsx z wynikami. Pierwszy wiersz arkusza musi zawierać
            nagłówki: Praktyka, Teoria, Końcowa, Ocena ustna, Ocena pisemna,
            zawód, Imię, Nazwisko, Pesel, Nr wniosku.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportResultsForm />
        </CardContent>
      </Card>
    </div>
  )
}
