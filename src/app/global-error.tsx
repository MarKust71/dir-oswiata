'use client'

import { useEffect } from 'react'

import './globals.css'
import { DB_CONNECTION_ERROR_MESSAGE } from '@/lib/db-error-message'

export default function GlobalError({
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
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {isDbError ? 'Brak połączenia z bazą danych' : 'Coś poszło nie tak'}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isDbError
            ? DB_CONNECTION_ERROR_MESSAGE
            : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'}
        </p>
        <button
          onClick={reset}
          className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Spróbuj ponownie
        </button>
      </body>
    </html>
  )
}
