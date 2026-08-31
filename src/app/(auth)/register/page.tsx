import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getMaintenanceMode } from '@/lib/settings'

import { RegisterForm } from './register-form'

export default async function RegisterPage() {
  const maintenanceMode = await getMaintenanceMode()

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm md:max-w-3xl">
        <CardHeader>
          <CardTitle className="text-xl">Rejestracja</CardTitle>
          <CardDescription>
            Uzyskanie dostępu do wyników wymaga założenia konta oraz
            potwierdzenia Twojego adresu e-mail (link w wiadomości) lub
            akceptacji administratora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceMode ? (
            <div className="flex flex-col gap-3 text-center">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Przerwa konserwacyjna</p>
                <p className="text-muted-foreground">
                  Rejestracja nowych kont jest chwilowo niedostępna.
                </p>
                <p className="text-muted-foreground">
                  Zajrzyj ponownie za kilka minut.
                </p>
              </div>
              <Link
                href="/"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Wróć na stronę główną
              </Link>
            </div>
          ) : (
            <RegisterForm />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
