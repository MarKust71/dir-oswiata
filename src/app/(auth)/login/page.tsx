import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getMaintenanceMode } from '@/lib/settings'

import { LoginForm } from './login-form'

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams
  const reason = Array.isArray(searchParams.reason)
    ? searchParams.reason[0]
    : searchParams.reason

  const maintenanceMode = await getMaintenanceMode()

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Logowanie</CardTitle>
          <CardDescription>
            Zaloguj się, używając adresu e-mail i hasła.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {maintenanceMode && (
            <div className="rounded-md bg-muted p-3 text-sm text-center">
              <p className="font-medium">Przerwa konserwacyjna</p>
              <p className="text-muted-foreground">
                Serwis będzie dostępny wkrótce.
              </p>
              <p className="text-muted-foreground">
                Zajrzyj ponownie za kilka minut.
              </p>
            </div>
          )}
          {reason === 'inactivity' && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Ze względów bezpieczeństwa nastąpiło automatyczne wylogowanie.
              Możesz zalogować się ponownie.
            </p>
          )}
          {reason === 'profile-correction' && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Zapisaliśmy Twoje poprawione dane. Twoje konto wymaga teraz
              ponownej aktywacji przez administratora.
            </p>
          )}
          {reason === 'duplicate-result-block' && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Podane dane odpowiadają wynikowi egzaminu przypisanemu już do
              innego konta. Ze względów bezpieczeństwa Twoje konto zostało
              zablokowane. Jeśli uważasz, że to pomyłka, skontaktuj się z DIR.
            </p>
          )}
          <LoginForm hideRegisterLink={maintenanceMode} />
        </CardContent>
      </Card>
    </div>
  )
}
