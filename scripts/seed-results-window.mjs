// Ustawia w tabeli "Settings" komplet kluczy konfiguracyjnych aplikacji (okres
// udostepnienia wynikow, limity weryfikacji numeru wniosku, czas automatycznego
// wylogowania, adresy e-mail do powiadomien) - zob. src/lib/settings.ts.
//
// Uzycie:
//   DATABASE_URL="postgresql://..." node scripts/seed-results-window.mjs
//
// Celowo NIE korzysta z .env.local - zeby latwo mozna bylo wskazac dowolna baze
// (np. produkcyjna) przez zmienna srodowiskowa w linii polecen, bez ryzyka
// pomylkowego uzycia lokalnego DATABASE_URL.

import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error(
    'Uzycie: DATABASE_URL="postgresql://..." node scripts/seed-results-window.mjs'
  )
  process.exit(1)
}

const SETTINGS = {
  results_visible_from: '2026-08-31T07:00:00+02:00',
  results_visible_until: '2026-09-15T00:00:00+02:00',
  max_application_number_attempts: '3',
  max_results_view_count: '3',
  inactivity_timeout_seconds: '900',
  // Celowo pusta - zeby seedowana baza nie wysylala powiadomien na prawdziwe adresy.
  emails_for_notifications: '[]',
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const keys = Object.keys(SETTINGS)
const values = Object.values(SETTINGS)
const placeholders = keys
  .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
  .join(', ')

await client.query(
  `INSERT INTO "Settings" (key, value) VALUES ${placeholders}
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  keys.flatMap((key, i) => [key, values[i]])
)

console.log('Ustawiono klucze konfiguracyjne:')
for (const [key, value] of Object.entries(SETTINGS)) {
  console.log(`  ${key} = ${value}`)
}
await client.end()
