import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { LoginForm } from './login-form'

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams
  const reason = Array.isArray(searchParams.reason)
    ? searchParams.reason[0]
    : searchParams.reason

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
          {reason === 'inactivity' && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Ze względów bezpieczeństwa nastąpiło automatyczne wylogowanie.
              Możesz zalogować się ponownie.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
