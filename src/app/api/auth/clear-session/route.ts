import { NextResponse } from 'next/server'

import { deleteSession } from '@/lib/session'

// Kasuje ciasteczko sesji (np. gdy JWT jest wciaz wazny, ale konto uzytkownika
// zostalo w miedzyczasie usuniete/dezaktywowane) i przekierowuje na /login.
// Uzywane zamiast bezposredniego redirect('/login') w dal.ts, zeby uniknac
// petli przekierowan z proxy.ts - ten ostatni optymistycznie ufa waznemu JWT
// i odbijalby z powrotem na /dashboard, mimo ze strona nie moze zaladowac usera.
export async function GET(request: Request) {
  await deleteSession()

  return NextResponse.redirect(new URL('/login', request.url))
}
