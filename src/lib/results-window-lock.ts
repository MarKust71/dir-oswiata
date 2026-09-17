import 'server-only'

import {
  getResultsVisibleUntil,
  getResultsWindowLockEnabled,
} from '@/lib/settings'

// Zob. src/app/(auth)/register/page.tsx, src/app/actions/auth.ts i
// src/app/panel/page.tsx - gdy przełącznik "results_window_lock_enabled" w
// Ustawieniach jest włączony, upływ terminu results_visible_until
// automatycznie wygasza rejestrację nowych kont oraz (dla roli STUDENT)
// dostęp do wyników egzaminu. Logowanie samo w sobie nigdy nie jest przez to
// blokowane - ograniczenia dotyczą tylko rejestracji i treści panelu
// studenta.
export async function isResultsWindowLockActive(): Promise<boolean> {
  const enabled = await getResultsWindowLockEnabled()
  if (!enabled) return false

  const until = await getResultsVisibleUntil()
  if (!until) return false

  return new Date() > until
}
