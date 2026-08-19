import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Tylko optymistyczne przekierowania na podstawie ciasteczka sesji (bez zapytan do bazy).
// Realna kontrola statusu konta i roli odbywa sie w src/lib/dal.ts przy kazdym zadaniu.

const PROTECTED_PREFIXES = ['/dashboard', '/panel']
const AUTH_PAGES = ['/login', '/register']

const secretKey = process.env.SESSION_SECRET
const encodedKey = secretKey ? new TextEncoder().encode(secretKey) : null

type OptimisticSession = { userId: string; role: 'ADMIN' | 'USER' | 'STUDENT' }

async function readSession(
  req: NextRequest
): Promise<OptimisticSession | null> {
  if (!encodedKey) return null
  const token = req.cookies.get('session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })

    return payload as unknown as OptimisticSession
  } catch {
    return null
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await readSession(req)

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session && AUTH_PAGES.includes(pathname)) {
    const home = session.role === 'STUDENT' ? '/panel' : '/dashboard'

    return NextResponse.redirect(new URL(home, req.url))
  }

  if (
    session &&
    session.role === 'STUDENT' &&
    pathname.startsWith('/dashboard')
  ) {
    return NextResponse.redirect(new URL('/panel', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
