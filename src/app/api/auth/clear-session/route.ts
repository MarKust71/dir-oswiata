import { NextResponse } from 'next/server'

import { deleteSession } from '@/lib/session'

// Kasuje ciasteczko sesji (np. gdy JWT jest wciąż ważny, ale konto użytkownika
// zostało w międzyczasie usunięte/dezaktywowane) i przekierowuje na /login.
// Używane zamiast bezpośredniego redirect('/login') w dal.ts, żeby uniknąć
// pętli przekierowań z proxy.ts - ten ostatni optymistycznie ufa ważnemu JWT
// i odbijałby z powrotem na /dashboard, mimo że strona nie może załadować usera.
export async function GET(request: Request) {
  await deleteSession()

  return NextResponse.redirect(new URL('/login', request.url))
}
