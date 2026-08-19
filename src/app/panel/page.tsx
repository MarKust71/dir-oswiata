import { requireUser } from '@/lib/dal'
import { roleLabels } from '@/lib/labels'
import { PeselBoxes } from '@/components/pesel-boxes'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function PanelPage() {
  const user = await requireUser()

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

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
        </CardContent>
      </Card>
    </div>
  )
}
