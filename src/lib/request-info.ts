import 'server-only'

import { headers } from 'next/headers'

/**
 * Adres IP i user-agent bieżącego żądania - dostępne w Server Actions i Route
 * Handlers (nie w zwykłych funkcjach biblioteki, np. src/lib/mailer.ts).
 */
export async function getClientRequestInfo() {
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0].trim() || headersList.get('x-real-ip')

  return {
    ip: ip || null,
    userAgent: headersList.get('user-agent'),
  }
}
