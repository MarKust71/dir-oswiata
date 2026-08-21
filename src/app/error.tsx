'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DB_CONNECTION_ERROR_MESSAGE } from '@/lib/db-error-message'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const isDbError = error.message === DB_CONNECTION_ERROR_MESSAGE

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {isDbError ? 'Brak połączenia z bazą danych' : 'Coś poszło nie tak'}
          </CardTitle>
          <CardDescription>
            {isDbError
              ? DB_CONNECTION_ERROR_MESSAGE
              : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} className="w-full">
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
